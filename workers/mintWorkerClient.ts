"use client";
import { createProxy } from "@nori-zk/workers";
import { WorkerParent } from "@nori-zk/workers/browser/parent";
import { type ZkAppWorker as ZkAppWorkerType } from "@nori-zk/mina-token-bridge/workers/defs";
import { JsonProof, NetworkId } from "o1js";
import envConfig from "@/helpers/env.ts";
import { EthProofResult } from "@/machines/types.ts";

// Types
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
type CompiledVerificationKeys = {
  noriStorageInterfaceVerificationKeySafe: VerificationKeySafe;
  ethVerifierVerificationKeySafe: VerificationKeySafe;
  noriTokenControllerVerificationKeySafe: VerificationKeySafe;
  fungibleTokenVerificationKeySafe: VerificationKeySafe;
};

// Env
const {
  NORI_TOKEN_CONTROLLER_ADDRESS: noriTokenControllerAddressBase58,
  TOKEN_BASE_ADDRESS: noriTokenBaseBase58,
} = envConfig;

export default class ZkappMintWorkerClient {
  // Worker ==================================================
  #mintWorker: TokenMintWorkerInst;

  // Flags ==================================================
  #compiling = false;
  compiled = false;
  #terminated = false;

  // Resolvers ==================================================
  // A resolver for if the worker has constructed and messaged the parent (aka main thread)
  #ready: Promise<void> | undefined;
  // Queue for all o1js method calls; resolves in order, return type depends on method
  #o1MethodResolver: Promise<
    void | string | boolean | EthProofResult | CompiledVerificationKeys
  > = Promise.resolve();

  // Vks ==================================================
  #noriStorageInterfaceVerificationKeySafe:
    | {
        data: string;
        hashStr: string;
      }
    | undefined;
  #verificationKeysSafe: CompiledVerificationKeys | undefined;

  // State ==================================================
  #compileTimeSeconds = 0;
  minaWalletPubKeyBase58: string; // Should be private with a getter
  ethWalletPubKeyBase58: string; // Should be private with a getter
  fixedValueOrSecret: string = "NoriZK";

  constructor() {
    const worker = new Worker(new URL("./mintWorker.ts", import.meta.url), {
      type: "module",
    });
    const workerParent = new WorkerParent(worker);
    const TokenMintWorker = createProxy<typeof ZkAppWorkerType>(workerParent);
    this.#mintWorker = new TokenMintWorker();
    this.#ready = this.#mintWorker.ready;
    console.log("Worker proxy created in constructor");
  }

  // Worker ==============================================================

  // Methods =======================================

  // Terminate the worker when your done with it.
  terminate() {
    this.#mintWorker.signalTerminate();
    this.#terminated = true;
  }

  // Resolvers =====================================

  // Use this function to know if the worker has fully loaded. Method calls will be buffered until this resolves.
  // So you don't actually have to await this. You can use the worker methods straight away :)
  ready() {
    return this.#ready;
  }

  // Guards =========================================
  // Ensure worker health
  private ensureWorkerHealth() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
  }

  // State setters ================================================================

  // So we expect ... this to be event driven either key can change at any time!
  setWallets(addresses: {
    minaPubKeyBase58?: string;
    ethPubKeyBase58?: string;
  }): ZkappMintWorkerClient {
    this.minaWalletPubKeyBase58 =
      addresses.minaPubKeyBase58 || this.minaWalletPubKeyBase58;
    this.ethWalletPubKeyBase58 =
      addresses.ethPubKeyBase58 || this.ethWalletPubKeyBase58;
    return this;
  }

  // PKARM =======================================================================

  // these dont need o1js functionality so dont need the o1js resolver guard
  async getCodeVerifyFromEthSignature(ethSignatureSecret: string) {
    this.ensureWorkerHealth();
    return this.#mintWorker.PKARM_obtainCodeVerifierFromEthSignature(
      ethSignatureSecret
    );
  }

  // These dont need o1js functionality so dont need the o1js resolver guard
  async createCodeChallenge(codeVerifierPKARMStr: string) {
    this.ensureWorkerHealth();
    return this.#mintWorker.PKARM_createCodeChallenge(
      codeVerifierPKARMStr,
      this.minaWalletPubKeyBase58
    );
  }

  // o1js =========================================================================

  // Network methods ===================================

  // Should be safe without a resolver
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

  // Compile methods ===================================

  // Compile if needed (expose private method)
  async compileIfNeeded() {
    return this.compile();
  }

  // Compile
  private async compile() {
    this.ensureWorkerHealth();
    if (this.compiled)
      return this.#verificationKeysSafe as CompiledVerificationKeys;
    if (this.#compiling)
      return this.#o1MethodResolver as Promise<CompiledVerificationKeys>;
    this.#compiling = true;
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      // Compile contracts
      const start = performance.now();
      const verificationKeys = await this.#mintWorker.compileAll();
      const end = performance.now();

      // Compute elapsed time
      const elapsedSeconds = ((end - start) / 1000).toFixed(2);
      console.log(`Compilation took ${elapsedSeconds} seconds.`);
      this.#compileTimeSeconds = parseFloat(elapsedSeconds);

      // Extract and print vks
      const {
        noriStorageInterfaceVerificationKeySafe,
        ethVerifierVerificationKeySafe,
        noriTokenControllerVerificationKeySafe,
        fungibleTokenVerificationKeySafe,
      } = verificationKeys;
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

      // Set serialisation safe vks
      this.#verificationKeysSafe = verificationKeys;
      this.#noriStorageInterfaceVerificationKeySafe =
        noriStorageInterfaceVerificationKeySafe;

      // Set flags
      this.#compiling = false;
      this.compiled = true;

      return verificationKeys as CompiledVerificationKeys;
    });
    return this.#o1MethodResolver as Promise<CompiledVerificationKeys>;
  }

  getLastCompileTimeSeconds() {
    return this.#compileTimeSeconds;
  }

  // compile flags =================================

  // Could make this a getter
  isCompilingContracts() {
    return this.#compiling;
  }

  // TODO contractsAreCompiled and areContractCompiled effectively do the same job
  contractsAreCompiled() {
    return this.compiled;
  }
  areContractCompiled() {
    if (this.#noriStorageInterfaceVerificationKeySafe) {
      return true;
    } else {
      return false;
    }
  }

  // Getter (hopefully state change detector compatible)
  /*get compiled() {
    return this.#compiled
  }*/

  // computable methods =================================================

  async setupStorage() {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
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
    });

    return this.#o1MethodResolver as Promise<string>;
  }

  async computeDepositAttestationWitnessAndEthVerifier(
    codeChallengePKARMStr: string,
    depositBlockNumber: number
  ) {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.computeDepositAttestationWitnessAndEthVerifier(
        codeChallengePKARMStr,
        depositBlockNumber,
        this.ethWalletPubKeyBase58.toLowerCase(), // Make sure its lower!
        envConfig.NORI_PCS_URL
      );
    });
    return this.#o1MethodResolver as Promise<EthProofResult>;
  }

  async computeMintTx(
    ethVerifierProofJson: JsonProof,
    depositAttestationInput: DepositAttestationInput,
    codeVerifierPKARMStr: string,
    needsToFundAccount: boolean // Use the needsToFundAccount function to determine this value.
  ) {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.mint(
        this.minaWalletPubKeyBase58,
        noriTokenControllerAddressBase58,
        ethVerifierProofJson,
        depositAttestationInput,
        codeVerifierPKARMStr,
        1e9 * 0.1,
        needsToFundAccount
      );
    });
    return this.#o1MethodResolver as Promise<string>;
  }

  // onChain state query methods ============================
  // Note we should really have graphql versions of the below functions to avoid having to compile the worker to use them @Karol

  async needsToFundAccount() {
    console.log("noriTokenBaseBase58", noriTokenBaseBase58);
    console.log("this.minaWalletPubKeyBase58", this.minaWalletPubKeyBase58);
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.needsToFundAccount(
        noriTokenBaseBase58,
        this.minaWalletPubKeyBase58
      );
    });
    return this.#o1MethodResolver as Promise<boolean>;
  }

  async needsToSetupStorage() {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.needsToSetupStorage(
        noriTokenControllerAddressBase58,
        this.minaWalletPubKeyBase58
      );
    });
    return this.#o1MethodResolver as Promise<boolean>;
  }

  async getBalanceOf() {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.getBalanceOf(
        noriTokenBaseBase58,
        this.minaWalletPubKeyBase58
      );
    });
    return this.#o1MethodResolver as Promise<string>;
  }

  async mintedSoFar() {
    await this.compileIfNeeded();
    this.#o1MethodResolver = this.#o1MethodResolver.then(async () => {
      return this.#mintWorker.mintedSoFar(
        noriTokenControllerAddressBase58,
        this.minaWalletPubKeyBase58
      );
    });
    return this.#o1MethodResolver as Promise<string>;
  }
}
