"client";
import { createProxy } from "@nori-zk/workers";
import { WorkerParent } from "@nori-zk/workers/browser/parent";
import { type ZkAppWorker as ZkAppWorkerType } from "@nori-zk/mina-token-bridge/workers/defs";
import { JsonProof, NetworkId } from "o1js";

type TokenMintWorkerInst = InstanceType<
  ReturnType<typeof createProxy<typeof ZkAppWorkerType>>
>;

type DepositAttestationInput = {
  path: string[];
  depositIndex: number;
  rootHash: string;
  despositSlotRaw: {
    slot_key_address: string;
    slot_nested_key_attestation_hash: string;
    value: string;
  };
};

type VerificationKeySafe = {
  hashStr: string;
  data: string;
};

// Both of these need to be configurable env vars, will be different for testnet / production
const MINA_RPC = "https://devnet.minaprotocol.network/graphql";
const ethTokenBridgeAddress = "0x3EEACD9caa1aDdBA939FF041C43020b516A51dcF";
const noriTokenControllerAddressBase58 =
  "B62qrMnJiMerBXb1469Q3qr1jkhFk92MMgk8orNNfXP3fFFWvjKsEja";
const noriTokenBaseBase58 =
  "B62qrqiUcXEAqTaQPW8tqwaBx3trx36yAeFzsiPigHXvou86APsY6gV";

export default class ZkappMintWorkerClient {
  #mintWorker: TokenMintWorkerInst;
  #ready: Promise<void> | undefined;
  #terminated = false;
  #noriStorageInterfaceVerificationKeySafe:
    | {
      data: string;
      hashStr: string;
    }
    | undefined;
  #compiling = false;
  #compiled = false;
  minaWalletPubKeyBase58: string;
  ethWalletPubKeyBase58: string;
  fixedValueOrSecret: string;

  constructor(
    minaWalletPubKeyBase58: string,
    ethWalletPubKeyBase58: string,
    optionalSecret = "NoriZK"
  ) {
    const worker = new Worker(new URL("./mintWorker.ts", import.meta.url), {
      type: "module",
    });
    const workerParent = new WorkerParent(worker);
    const TokenMintWorker = createProxy<typeof ZkAppWorkerType>(workerParent);
    this.#mintWorker = new TokenMintWorker();
    this.#ready = this.#mintWorker.ready;
    this.minaWalletPubKeyBase58 = minaWalletPubKeyBase58;
    this.ethWalletPubKeyBase58 = ethWalletPubKeyBase58;
    this.fixedValueOrSecret = optionalSecret;
    console.log("Worker proxy created in constructor");
  }

  // Terminate the worker when your done with it.
  terminate() {
    this.#mintWorker.terminate();
    this.#terminated = true;
  }

  // Use this function to know if the worker has fully loaded. Method calls will be buffered until this resolves.
  // So you don't actually have to await this. You can use the worker methods straight away :)
  ready() {
    return this.#ready;
  }
  // async setWallets(minaWalletPubKeyBase58: string, ethWalletPubKeyBase58: string,optionalSecret = 'NoriZK') {
  //   this.minaWalletPubKeyBase58 = minaWalletPubKeyBase58;
  //   this.ethWalletPubKeyBase58 = ethWalletPubKeyBase58;
  // }

  async minaSetup(options: {
    networkId?: NetworkId;
    mina: string | string[];
    archive?: string | string[];
    lightnetAccountManager?: string;
    bypassTransactionLimits?: boolean;
    minaDefaultHeaders?: HeadersInit;
    archiveDefaultHeaders?: HeadersInit;
  }) {
    this.ensureWorkerHealth();
    return this.#mintWorker.minaSetup(options);
  }
  // PKARM
  async getCodeVerifyFromEthSignature(ethSignatureSecret: string) {
    console.log(
      "getCodeVerifyFromEthSignature called with:",
      ethSignatureSecret
    );
    this.ensureWorkerHealth();
    return this.#mintWorker.PKARM_obtainCodeVerifierFromEthSignature(
      ethSignatureSecret
    );
  }

  async createCodeChallenge(codeVerifierPKARMStr: string) {
    this.ensureWorkerHealth();
    return this.#mintWorker.PKARM_createCodeChallenge(
      codeVerifierPKARMStr,
      this.minaWalletPubKeyBase58
    );
  }

  // Compile if needed
  async compileIfNeeded() {
    this.ensureWorkerHealth();
    if (this.#noriStorageInterfaceVerificationKeySafe) return;
    if (this.#compiling === true) return await this.compiledResolver; // If we are already compiling, don't trigger compile again! But do wait for resolution of the compile.
    await this.compile();
  }

  // Ensure worker health
  private ensureWorkerHealth() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
  }

  compiledResolver: Promise<{
    noriStorageInterfaceVerificationKeySafe: VerificationKeySafe;
    ethVerifierVerificationKeySafe: VerificationKeySafe;
    noriTokenControllerVerificationKeySafe: VerificationKeySafe;
    fungibleTokenVerificationKeySafe: VerificationKeySafe;
  }>;

  private async compile() {
    this.#compiling = true;
    if (this.#noriStorageInterfaceVerificationKeySafe) return;

    const compileResolver = this.#mintWorker.compileAll();
    this.compiledResolver = compileResolver;
    const {
      noriStorageInterfaceVerificationKeySafe,
      ethVerifierVerificationKeySafe,
      noriTokenControllerVerificationKeySafe,
      fungibleTokenVerificationKeySafe,
    } = await compileResolver;

    console.log(
      "ethVerifierVerificationKeySafe",
      ethVerifierVerificationKeySafe
    );
    console.log(
      "noriTokenControllerVerificationKeySafe",
      noriTokenControllerVerificationKeySafe
    );
    console.log(
      "noriStorageInterfaceVerificationKeySafe",
      noriStorageInterfaceVerificationKeySafe
    );
    console.log(
      "fungibleTokenVerificationKeySafe",
      fungibleTokenVerificationKeySafe
    );
    this.#compiling = false;
    this.#compiled = true;
    this.#noriStorageInterfaceVerificationKeySafe =
      noriStorageInterfaceVerificationKeySafe;
  }

  async setupStorage() {
    await this.compileIfNeeded();
    // Get a json string of the proved setup storage transaction.
    const provedSetupTxStr = await this.#mintWorker.setupStorage(
      this.minaWalletPubKeyBase58,
      noriTokenControllerAddressBase58,
      0.1 * 1e9,
      this.#noriStorageInterfaceVerificationKeySafe!
    );
    console.log(
      "provedSetupTxStr in mintWorkerClient",
      provedSetupTxStr.length
    );
    return provedSetupTxStr;

  }

  async computeDepositAttestationWitnessAndEthVerifier(
    codeChallengePKARMStr: string,
    depositBlockNumber: number
    // ethAddressLowerHex: string
  ) {
    await this.compileIfNeeded();
    return this.#mintWorker.computeDepositAttestationWitnessAndEthVerifier(
      codeChallengePKARMStr,
      depositBlockNumber,
      this.ethWalletPubKeyBase58.toLowerCase() // Make sure its lower!
    );
  }

  async computeMintTx(
    // minaSenderPublicKeyBase58: string,
    ethVerifierProofJson: JsonProof,
    depositAttestationInput: DepositAttestationInput,
    codeVerifierPKARMStr: string,
    needsToFundAccount: boolean // Use the needsToFundAccount function to determine this value.
  ) {
    await this.compileIfNeeded();
    return this.#mintWorker.mint(
      this.minaWalletPubKeyBase58,
      noriTokenControllerAddressBase58,
      ethVerifierProofJson,
      depositAttestationInput,
      codeVerifierPKARMStr,
      1e9 * 0.1,
      needsToFundAccount
    );
  }

  // Note we should really have graphql versions of the below functions to avoid having to compile the worker to use them @Karol

  async needsToFundAccount() {
    await this.compileIfNeeded();
    return this.#mintWorker.needsToFundAccount(
      noriTokenBaseBase58,
      this.minaWalletPubKeyBase58
    );
  }

  async needsToSetupStorage() {
    await this.compileIfNeeded();
    return this.#mintWorker.needsToSetupStorage(
      noriTokenControllerAddressBase58,
      this.minaWalletPubKeyBase58
    );
  }

  async getBalanceOf() {
    await this.compileIfNeeded();
    return this.#mintWorker.getBalanceOf(
      noriTokenBaseBase58,
      this.minaWalletPubKeyBase58
    );
  }

  async mintedSoFar() {
    await this.compileIfNeeded();
    return this.#mintWorker.mintedSoFar(
      noriTokenControllerAddressBase58,
      this.minaWalletPubKeyBase58
    );
  }
  isCompilingContracts() {
    return this.#compiling;
  }
  contractsAreCompiled() {
    return this.#compiled;
  }

  async areContractCompiled() {
    if (this.#noriStorageInterfaceVerificationKeySafe) {
      return true;
    } else {
      return false;
    }
  }
}
