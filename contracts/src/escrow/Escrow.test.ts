import {
  AccountUpdate,
  Bool,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
  UInt8,
} from 'o1js';
import { FungibleToken, FungibleTokenAdmin } from '../index.js';
import { TokenEscrow } from './Escrow.js';
import assert from 'node:assert';
import { test, describe, before } from 'node:test';

const proofsEnabled = true;
const enforceTransactionLimits = false;
let isTokenDeployed = false;
let isTokenInitialised = false;
let isEscrowDeployed = false;

type Keypair = {
  publicKey: PublicKey;
  privateKey: PrivateKey;
};

describe('Escrow', async () => {
  const fee = 1e8;
  let deployer: Mina.TestPublicKey,
    owner: Mina.TestPublicKey,
    whale: Mina.TestPublicKey,
    colin: Mina.TestPublicKey,
    dave: Mina.TestPublicKey,
    jackie: Mina.TestPublicKey;
  let token: FungibleToken;
  let tokenId: Field;
  let escrow: TokenEscrow;
  let adminContract: FungibleTokenAdmin;
  let tokenContract: Keypair, escrowContract: Keypair, admin: Keypair;

  before(async () => {
    if (proofsEnabled) {
      await TokenEscrow.compile();
      await FungibleToken.compile();
      await FungibleTokenAdmin.compile();
    }
    const Local = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits,
    });
    Mina.setActiveInstance(Local);
    [deployer, owner, whale, colin, dave, jackie] = Local.testAccounts;
    tokenContract = PrivateKey.randomKeypair();
    escrowContract = PrivateKey.randomKeypair();
    admin = PrivateKey.randomKeypair();
    console.log(`
          deployer ${deployer.toBase58()}
          owner ${owner.toBase58()}
          whale ${whale.toBase58()}
          colin ${colin.toBase58()}
          dave ${dave.toBase58()}
          jackie ${jackie.toBase58()}
          token ${tokenContract.publicKey.toBase58()}
          escrow ${escrowContract.publicKey.toBase58()}
          admin ${admin.publicKey.toBase58()}
        `);
    token = new FungibleToken(tokenContract.publicKey);
    tokenId = token.deriveTokenId();
    escrow = new TokenEscrow(escrowContract.publicKey, tokenId);
    adminContract = new FungibleTokenAdmin(admin.publicKey);
  });

  async function deployTokenAdminContract() {
    console.log('deploying token & admin contract');
    const txn = await Mina.transaction(
      {
        sender: deployer,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(deployer, 2);
        await adminContract.deploy({ adminPublicKey: admin.publicKey });
        await token.deploy({
          symbol: 'abc',
          src: 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts',
          allowUpdates: true,
        });
      }
    );
    await txn.prove();
    txn.sign([deployer.key, tokenContract.privateKey, admin.privateKey]);
    await txn.send().then((v) => v.wait());
    isTokenDeployed = true;
  }

  async function deployEscrowContract() {
    console.log('deploy escrow contract');
    const txn = await Mina.transaction(
      {
        sender: deployer,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(deployer, 1);
        await escrow.deploy({
          tokenAddress: tokenContract.publicKey,
          owner,
        });
        await token.approveAccountUpdate(escrow.self);
      }
    );
    await txn.prove();
    txn.sign([deployer.key, escrowContract.privateKey]);
    await txn.send().then((v) => v.wait());
    isEscrowDeployed = true;
  }

  async function initialiseTokenContract() {
    console.log('initialise token admin');
    const txn = await Mina.transaction(
      {
        sender: deployer,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(deployer, 1);

        await token.initialize(
          admin.publicKey,
          UInt8.from(9),
          // We can set `startPaused` to `Bool(false)` here, because we are doing an atomic deployment
          // If you are not deploying the admin and token contracts in the same transaction,
          // it is safer to start the tokens paused, and resume them only after verifying that
          // the admin contract has been deployed
          Bool(false)
        );
      }
    );
    await txn.prove();
    txn.sign([deployer.key, tokenContract.privateKey, admin.privateKey]);
    await txn.send().then((v) => v.wait());
    isTokenInitialised = true;
  }

  async function mintToAccount(mintee: Mina.TestPublicKey) {
    console.log('mint to account');
    const mintTx = await Mina.transaction(
      {
        sender: owner,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(owner, 1);
        await token.mint(mintee, new UInt64(2e9));
      }
    );
    await mintTx.prove();
    mintTx.sign([owner.key, admin.privateKey]);
    await mintTx.send().then((v) => v.wait());
  }

  async function transferTokens(
    giver: Mina.TestPublicKey,
    receiver: Mina.TestPublicKey
  ) {
    console.log('transferring tokens');
    const transferTx = await Mina.transaction(
      {
        sender: giver,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(giver, 1);
        await token.transfer(giver, receiver, new UInt64(1e9));
      }
    );
    await transferTx.prove();
    transferTx.sign([giver.key]);
    await transferTx.send().then((v) => v.wait());
  }

  async function depositToEscrow(depositer: Mina.TestPublicKey) {
    const txn = await Mina.transaction(
      {
        sender: depositer,
        fee,
      },
      async () => {
        await escrow.deposit(new UInt64(2e9));
        await token.approveAccountUpdate(escrow.self);
      }
    );
    await txn.prove();
    txn.sign([depositer.key]);
    await txn.send().then((v) => v.wait());
  }

  async function withdrawFromEscrow(withdrawTo: Mina.TestPublicKey) {
    console.log('withdraw from escrow');
    const txn = await Mina.transaction(
      {
        sender: owner,
        fee,
      },
      async () => {
        AccountUpdate.fundNewAccount(owner, 1);
        await escrow.withdraw(withdrawTo, new UInt64(1e9));
        await token.approveAccountUpdate(escrow.self);
      }
    );
    await txn.prove();
    txn.sign([owner.key]);
    await txn.send().then((v) => v.wait());
    // console.log('Withdraw tx result:', withdrawTxResult.toPretty());
    // assert.equal(withdrawTxResult.status, 'included');
  }

  async function conditionalTokenSetUp() {
    console.log('conditionalTokenSetUp');
    if (!isTokenDeployed) await deployTokenAdminContract();
    if (!isTokenInitialised) await initialiseTokenContract();
  }

  async function conditionalEscrowSetUp() {
    console.log('conditionalEscrowSetUp');
    if (!isEscrowDeployed) await deployEscrowContract();
  }

  test('initialise token contract test', async () => {
    await conditionalTokenSetUp();
    const tokenAdminKey = await token.admin.fetch();
    const tokenDecimal = await token.decimals.fetch();
    assert.equal(tokenAdminKey.toBase58(), admin.publicKey.toBase58());
    assert.equal(tokenDecimal, 9);
  });

  test('mint to account', async () => {
    const daveBalanceBeforeMint = (await token.getBalanceOf(dave)).toBigInt();
    assert.equal(daveBalanceBeforeMint, 0n);
    await conditionalTokenSetUp();
    await mintToAccount(dave);
    const daveBalanceAfterMint = (await token.getBalanceOf(dave)).toBigInt();
    assert.equal(daveBalanceAfterMint, BigInt(2e9));
  });

  test('transfer from dave account to colin', async () => {
    const colinBalanceBeforeMint = (await token.getBalanceOf(colin)).toBigInt();
    const daveBalanceBeforeMint = (await token.getBalanceOf(dave)).toBigInt();
    assert.equal(colinBalanceBeforeMint, 0n);
    await conditionalTokenSetUp();
    if (daveBalanceBeforeMint == 0n) await mintToAccount(dave);
    const daveBalanceAfterMint = (await token.getBalanceOf(dave)).toBigInt();
    assert.equal(daveBalanceAfterMint, BigInt(2e9));
    await transferTokens(dave, colin);
    const colinBalanceAfterTransfer = (
      await token.getBalanceOf(colin)
    ).toBigInt();
    const daveBalanceAfterTransfer = (
      await token.getBalanceOf(dave)
    ).toBigInt();
    assert.equal(colinBalanceAfterTransfer, BigInt(1e9));
    assert.equal(daveBalanceAfterTransfer, BigInt(1e9));
  });

  test('deploy escrow contract', async () => {
    await conditionalTokenSetUp();
    await conditionalEscrowSetUp();
    const escrowTokenAddress = await escrow.tokenAddress.fetch();
    assert.equal(
      escrowTokenAddress.toBase58(),
      tokenContract.publicKey.toBase58()
    );
  });

  test('deposit to escrow', async () => {
    await conditionalTokenSetUp();
    await conditionalEscrowSetUp();
    const whaleBalanceBeforeDeposit = (
      await token.getBalanceOf(whale)
    ).toBigInt();
    const escrowBalanceBeforeDeposit = (await escrow.total.fetch()).toBigInt();
    assert.equal(escrowBalanceBeforeDeposit, 0n);
    if (whaleBalanceBeforeDeposit == 0n) await mintToAccount(whale);
    const whaleBalanceAfterMint = (await token.getBalanceOf(whale)).toBigInt();
    assert.equal(whaleBalanceAfterMint, BigInt(2e9));
    await depositToEscrow(whale);
    const escrowBalanceAfterDeposit = (await escrow.total.fetch()).toBigInt();
    assert.equal(escrowBalanceAfterDeposit, BigInt(2e9));
    const whaleBalanceAfterDeposit = (
      await token.getBalanceOf(whale)
    ).toBigInt();
    assert.equal(whaleBalanceAfterDeposit, 0n);
  });

  test('withdraw from escrow', async () => {
    await conditionalTokenSetUp();
    await conditionalEscrowSetUp();
    const whaleBalanceBeforeDeposit = (
      await token.getBalanceOf(whale)
    ).toBigInt();
    if (whaleBalanceBeforeDeposit == 0n) await mintToAccount(whale);
    await depositToEscrow(whale);
    await withdrawFromEscrow(jackie);
    const jackieBalanceAfterWithdraw = (
      await token.getBalanceOf(jackie)
    ).toBigInt();
    const escrowBalanceAfterWithdraw = (await escrow.total.fetch()).toBigInt();

    console.log('jackieBalanceAfterWithdraw', jackieBalanceAfterWithdraw);
    console.log('escrowBalanceAfterWithdraw', escrowBalanceAfterWithdraw);

    assert.equal(jackieBalanceAfterWithdraw, BigInt(1e9));
    assert.equal(escrowBalanceAfterWithdraw, BigInt(1e9));
  });
});

// console.log('Deploying token contract.');
// const deployTokenTx = await Mina.transaction(
//   {
//     sender: deployer,
//     fee,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(deployer, 3);
//     await adminContract.deploy({ adminPublicKey: admin.publicKey });
//     await token.deploy({
//       symbol: 'abc',
//       src: 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts',
//       allowUpdates: true,
//     });
//     await token.initialize(
//       admin.publicKey,
//       UInt8.from(9),
//       // We can set `startPaused` to `Bool(false)` here, because we are doing an atomic deployment
//       // If you are not deploying the admin and token contracts in the same transaction,
//       // it is safer to start the tokens paused, and resume them only after verifying that
//       // the admin contract has been deployed
//       Bool(true)
//     );
//   }
// );
// await deployTokenTx.prove();
// deployTokenTx.sign([deployer.key, tokenContract.privateKey, admin.privateKey]);
// const deployTokenTxResult = await deployTokenTx.send().then((v) => v.wait());
// console.log('Deploy token tx result:', deployTokenTxResult.toPretty());
// assert.equal(deployTokenTxResult.status, 'included');

// console.log('Deploying escrow contract.');
// const deployEscrowTx = await Mina.transaction(
//   {
//     sender: deployer,
//     fee,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(deployer, 1);
//     await escrow.deploy({
//       tokenAddress: tokenContract.publicKey,
//       owner,
//     });
//     await token.approveAccountUpdate(escrow.self);
//   }
// );
// await deployEscrowTx.prove();
// deployEscrowTx.sign([deployer.key, escrowContract.privateKey]);
// const deployEscrowTxResult = await deployEscrowTx.send().then((v) => v.wait());
// console.log('Deploy escrow tx result:', deployEscrowTxResult.toPretty());
// assert.equal(deployEscrowTxResult.status, 'included');

// console.log('Minting new tokens to Alexa and Billy.');
// const mintTx1 = await Mina.transaction(
//   {
//     sender: owner,
//     fee,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(owner, 1);
//     await token.mint(alexa, new UInt64(2e9));
//   }
// );
// await mintTx1.prove();
// mintTx1.sign([owner.key, admin.privateKey]);
// const mintTxResult1 = await mintTx1.send().then((v) => v.wait());
// console.log('Mint tx result 1:', mintTxResult1.toPretty());
// assert.equal(mintTxResult1.status, 'included');

// const mintTx2 = await Mina.transaction(
//   {
//     sender: owner,
//     fee,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(owner, 1);
//     await token.mint(billy, new UInt64(3e9));
//   }
// );
// await mintTx2.prove();
// mintTx2.sign([owner.key, admin.privateKey]);
// const mintTxResult2 = await mintTx2.send().then((v) => v.wait());
// console.log('Mint tx result 2:', mintTxResult2.toPretty());
// assert.equal(mintTxResult2.status, 'included');

// console.log('Alexa deposits tokens to the escrow.');
// const depositTx1 = await Mina.transaction(
//   {
//     sender: alexa,
//     fee,
//   },
//   async () => {
//     await escrow.deposit(new UInt64(2e9));
//     await token.approveAccountUpdate(escrow.self);
//   }
// );
// await depositTx1.prove();
// depositTx1.sign([alexa.key]);
// const depositTxResult1 = await depositTx1.send().then((v) => v.wait());
// console.log('Deposit tx result 1:', depositTxResult1.toPretty());
// assert.equal(depositTxResult1.status, 'included');

// const escrowBalanceAfterDeposit1 = (
//   await token.getBalanceOf(escrowContract.publicKey)
// ).toBigInt();
// console.log(
//   'Escrow balance after 1st deposit:',
//   escrowBalanceAfterDeposit1 / 1_000_000_000n
// );
// assert.equal(escrowBalanceAfterDeposit1, BigInt(2e9));

// console.log('Billy deposits tokens to the escrow.');
// const depositTx2 = await Mina.transaction(
//   {
//     sender: billy,
//     fee,
//   },
//   async () => {
//     await escrow.deposit(new UInt64(3e9));
//     await token.approveAccountUpdate(escrow.self);
//   }
// );
// await depositTx2.prove();
// depositTx2.sign([billy.key]);
// const depositTxResult2 = await depositTx2.send().then((v) => v.wait());
// console.log('Deposit tx result 2:', depositTxResult2.toPretty());
// assert.equal(depositTxResult2.status, 'included');

// const escrowBalanceAfterDeposit2 = (
//   await token.getBalanceOf(escrowContract.publicKey)
// ).toBigInt();
// console.log(
//   'Escrow balance after 2nd deposit:',
//   escrowBalanceAfterDeposit2 / 1_000_000_000n
// );
// assert.equal(escrowBalanceAfterDeposit2, BigInt(5e9));

// const escrowTotalAfterDeposits = escrow.total.get();
// assert.equal(escrowTotalAfterDeposits.toBigInt(), escrowBalanceAfterDeposit2);

// console.log('Escrow owner withdraws portion of tokens to Jackie.');
// const withdrawTx = await Mina.transaction(
//   {
//     sender: owner,
//     fee,
//   },
//   async () => {
//     AccountUpdate.fundNewAccount(owner, 1);
//     await escrow.withdraw(jackie, new UInt64(4e9));
//     await token.approveAccountUpdate(escrow.self);
//   }
// );
// await withdrawTx.prove();
// withdrawTx.sign([owner.key]);
// const withdrawTxResult = await withdrawTx.send().then((v) => v.wait());
// console.log('Withdraw tx result:', withdrawTxResult.toPretty());
// assert.equal(withdrawTxResult.status, 'included');

// const escrowBalanceAfterWithdraw = (
//   await token.getBalanceOf(escrowContract.publicKey)
// ).toBigInt();
// console.log(
//   'Escrow balance after withdraw:',
//   escrowBalanceAfterWithdraw / 1_000_000_000n
// );
// assert.equal(escrowBalanceAfterWithdraw, BigInt(1e9));

// console.log(
//   'Jackie should fail to withdraw all remaining in escrow contract tokens directly without using escrow contract.'
// );
// const directWithdrawTx = await Mina.transaction(
//   {
//     sender: jackie,
//     fee,
//   },
//   async () => {
//     await token.transfer(escrowContract.publicKey, jackie, new UInt64(1e9));
//   }
// );
// await directWithdrawTx.prove();
// directWithdrawTx.sign([jackie.key, escrowContract.privateKey]);
// const directWithdrawTxResult = await directWithdrawTx.safeSend();
// console.log('Direct Withdraw tx status:', directWithdrawTxResult.status);
// assert.equal(directWithdrawTxResult.status, 'rejected');

// const escrowBalanceAfterDirectWithdraw = (
//   await token.getBalanceOf(escrowContract.publicKey)
// ).toBigInt();
// console.log(
//   'Escrow balance after the attempt of direct withdraw:',
//   escrowBalanceAfterDirectWithdraw / 1_000_000_000n
// );
// assert.equal(escrowBalanceAfterDirectWithdraw, BigInt(1e9));

// const escrowTotalAfterWithdraw = escrow.total.get();
// assert.equal(escrowTotalAfterWithdraw.toBigInt(), escrowBalanceAfterWithdraw);
