import {
  AccountUpdate,
  Bool,
  Cache,
  fetchAccount,
  Field,
  Mina,
  Poseidon,
  PrivateKey,
  PublicKey,
  UInt64,
  UInt8,
  // Keypair,
  VerificationKey,
} from 'o1js';
import { FungibleToken } from './TokenBase.js';
import assert from 'node:assert';
import { test, describe, before } from 'node:test';
import { NoriStorageInterface } from './NoriStorageInterface.js';
import { NoriTokenController } from './NoriTokenController.js';

const proofsEnabled = true;
const fee = 1e8;
type Keypair = {
  publicKey: PublicKey;
  privateKey: PrivateKey;
};
describe('NoriTokenController', async () => {
  // test accounts
  let deployer: Mina.TestPublicKey,
    admin: Mina.TestPublicKey,
    alice: Mina.TestPublicKey,
    bob: Mina.TestPublicKey,
    colin: Mina.TestPublicKey,
    dave: Mina.TestPublicKey;
  // contracts + keys
  let tokenBase: FungibleToken;
  let tokenBaseVK: VerificationKey;
  let tokenBaseKeypair: Keypair;
  let noriTokenController: NoriTokenController;
  let noriTokenControllerVK: VerificationKey;
  let noriTokenControllerKeypair: Keypair;
  let storageInterfaceVK: VerificationKey;

  before(async () => {
    // compile contracts
    storageInterfaceVK = (
      await NoriStorageInterface.compile({ cache: Cache.FileSystem('./cache') })
    ).verificationKey;
    if (proofsEnabled) {
      tokenBaseVK = (
        await FungibleToken.compile({
          cache: Cache.FileSystem('./cache'),
        })
      ).verificationKey;

      noriTokenControllerVK = (
        await NoriTokenController.compile({
          cache: Cache.FileSystem('./cache'),
        })
      ).verificationKey;
    }
    // setup env
    const Local = await Mina.LocalBlockchain({
      proofsEnabled,
      // enforceTransactionLimits,
    });
    Mina.setActiveInstance(Local);
    [deployer, admin, alice, bob, colin, dave] = Local.testAccounts;

    tokenBaseKeypair = PrivateKey.randomKeypair();
    tokenBase = new FungibleToken(tokenBaseKeypair.publicKey);
    noriTokenControllerKeypair = PrivateKey.randomKeypair();
    noriTokenController = new NoriTokenController(
      noriTokenControllerKeypair.publicKey
    );
    console.log(`
      deployer ${deployer.toBase58()}
      admin ${admin.toBase58()}
      alice ${alice.toBase58()}
      bob ${bob.toBase58()}
      colin ${colin.toBase58()}
      dave ${dave.toBase58()}
      tokenBase ${tokenBaseKeypair.publicKey.toBase58()}
      noriTokenController ${noriTokenControllerKeypair.publicKey.toBase58()}
    `);
  });

  test('should deploy and initilise contracts', async () => {
    const decimals = UInt8.from(18);
    await txSend({
      body: async () => {
        AccountUpdate.fundNewAccount(deployer, 3);
        await noriTokenController.deploy({
          adminPublicKey: admin,
        });
        await tokenBase.deploy({
          symbol: 'nETH',
          src: 'https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts',
          allowUpdates: true,
        });
        await tokenBase.initialize(
          noriTokenControllerKeypair.publicKey,
          decimals,
          Bool(false) // it's safer to set to false later, after verifying controller was deployed correctly
        );
      },
      sender: deployer,
      signers: [
        deployer.key,
        noriTokenControllerKeypair.privateKey,
        tokenBaseKeypair.privateKey,
      ],
    });
    const onchainAdmin = await noriTokenController.adminPublicKey.fetch();
    assert.equal(
      onchainAdmin.toBase58(),
      admin.toBase58(),
      'admin public key does not match'
    );

    const onchainDecimals = await tokenBase.decimals.fetch();
    assert.equal(
      onchainDecimals.toString(),
      decimals.toString(),
      'decimals do not match'
    );

    console.log('initilising and deploying contracts done');
  });
});

async function txSend({
  body,
  sender,
  signers,
  fee: txFee = fee,
}: {
  body: () => Promise<void>;
  sender: PublicKey;
  signers: PrivateKey[];
  fee?: number;
}) {
  const tx = await Mina.transaction({ sender, fee: txFee }, body);
  await tx.prove();
  tx.sign(signers);
  const pendingTx = await tx.send();
  const transaction = await pendingTx.wait();
  return transaction;
}
