/**
 * Example where the verifier is a zkApp.
 */
import {
  SmartContract,
  Bytes,
  UInt64,
  declareMethods,
  Mina,
  TokenId,
  PrivateKey,
} from 'o1js';
import {
  Operation,
  Credential,
  Presentation,
  PresentationRequest,
  Schema,
  PresentationSpec,
  DynamicBytes,
} from 'mina-attestations';
import { EcdsaEthereum } from 'mina-attestations/imported';
import { Wallet } from 'ethers/wallet';
import { id } from 'ethers/hash';
const zkapp = PrivateKey.randomKeypair();
const zkAppAddress = zkapp.publicKey;

const maxMessageLength = 3;
const proofsEnabled = true;
const Message = DynamicBytes({ maxLength: maxMessageLength });
// wallets
let { publicKey: minaPubKey, privateKey: ownerKey } =
  PrivateKey.randomKeypair();
let signer = new Wallet(id('test'));

// signature
let message = 'abc';
const parseHex = (hex: string) => Bytes.fromHex(hex.slice(2)).toBytes();
const hashMessage = (msg: string) => parseHex(id(msg));
//metamask tell u to sign : hash(message) = '62636'
//mapping[msg.sender]['6236'] = 7
let sig = await signer.signMessage(hashMessage(message));

console.time('compileDependencies');
await EcdsaEthereum.compileDependencies({
  maxMessageLength,
  proofsEnabled,
});
console.timeEnd('compileDependencies');
const EcdsaCredential = await EcdsaEthereum.Credential({
  maxMessageLength,
});
console.time('compileEcdsaCredential');
await EcdsaCredential.compile({ proofsEnabled });
console.timeEnd('compileEcdsaCredential');

// create credential (which verifies the signature)
let { signature, parityBit } = EcdsaEthereum.parseSignature(sig);
let credential = await EcdsaCredential.create({
  owner: minaPubKey,
  publicInput: { signerAddress: EcdsaEthereum.parseAddress(signer.address) },
  privateInput: { message: Message.fromString(message), signature, parityBit },
});

const credentialJson = Credential.toJSON(credential);
console.log('✅ ISSUER: issued credential:', credentialJson);

// ---------------------------------------------
// WALLET: deserialize, validate and store the credential

let storedCredential = await Credential.fromJSON(credentialJson);

await Credential.validate(storedCredential);

console.log('✅ WALLET: imported and validated credential');

// ---------------------------------------------
// ZKAPP VERIFIER: define a presentation and SmartContract

// let spec = EcdsaCredential.spec;

let sp = PresentationSpec({ credential: Credential.Imported }, ({ credential }) => ({
  // outputClaim: Operation.,
}));
// let precompiled = await ProvablePresentation()
let precompiled = await Presentation.precompile(sp);

// this class defines the zkApp input type
// using this class in a zkApp will hard-code the particular presentation spec that it verifies
class ProvablePresentation extends precompiled.ProvablePresentation {}

// let info = (await precompiled.program.program.analyzeMethods()).run;
// console.log('presentation circuit summary', info?.summary());

console.log('✅ VERIFIER: compiled presentation spec');

class ZkAppVerifier extends SmartContract {
  async verifyPresentation(presentation: ProvablePresentation) {
    // verify the presentation, and receive its claims for further validation and usage
    let { claims, outputClaim } = presentation.verify({
      publicKey: this.address,
      tokenId: this.tokenId,
      methodName: 'verifyPresentation',
    });

    // check that `createdAt` is a recent timestamp, by adding a precondition on the current slot.
    // we have to convert timestamp (in ms) to 3-minute slots since genesis
    // let { createdAt } = claims;
    // const genesisTimestamp = +new Date('2024-06-04T16:00:00.000000-08:00');
    // const slot = 3 * 60 * 1000;
    // let slotEstimate = createdAt.sub(genesisTimestamp).div(slot).toUInt32();
    // // allow `createdAt` to be about 5 slots old
    // this.currentSlot.requireBetween(slotEstimate, slotEstimate.add(5));

    // check that the issuer matches a hard-coded public key
    // outputClaim.assertEquals(
    //   Credential.Native.issuer(issuer),
    //   'invalid issuer'
    // );
  }
}
declareMethods(ZkAppVerifier, {
  verifyPresentation: [ProvablePresentation as any], // TODO bad TS interface
});

await ZkAppVerifier.compile();
let cs = await ZkAppVerifier.analyzeMethods();
console.log('zkApp rows', cs.verifyPresentation?.rows);
console.log('✅ VERIFIER: compiled zkapp that verifies the presentation');

// ZKAPP VERIFIER, outside circuit: request a presentation

let request = PresentationRequest.zkAppFromCompiled(
  precompiled,
  { createdAt: UInt64.from(Date.now()) },
  {
    // this added context ensures that the presentation can't be used outside the target zkApp
    publicKey: zkAppAddress,
    tokenId: TokenId.default,
    methodName: 'verifyPresentation',
  }
);
let requestJson = PresentationRequest.toJSON(request);

console.log(
  '✅ VERIFIER: created presentation request:',
  requestJson.slice(0, 500) + '...'
);

// ---------------------------------------------
// WALLET: deserialize request and create presentation

let deserialized = PresentationRequest.fromJSON('zk-app', requestJson);

console.time('create');
let presentation = await Presentation.create(ownerKey, {
  request: deserialized,
  credentials: [storedCredential],
  context: undefined,
});
console.timeEnd('create');

let serialized = Presentation.toJSON(presentation);
console.log(
  '✅ WALLET: created presentation:',
  serialized.slice(0, 2000) + '...'
);

// ---------------------------------------------
// ZKAPP VERIFIER: call zkapp with presentation and create transaction

let presentation2 = Presentation.fromJSON(serialized);
let Local = await Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

let tx = await Mina.transaction(() =>
  new ZkAppVerifier(zkAppAddress).verifyPresentation(
    ProvablePresentation.from(presentation2)
  )
);
await tx.prove();

console.log('✅ VERIFIER: verified presentation', tx.toPretty());
