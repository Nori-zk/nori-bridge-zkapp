import { createProxy } from "@nori-zk/workers";
import { WorkerParent } from "@nori-zk/workers/browser/parent";
import { type TokenMintWorker as TokenMintWorkerType } from "@nori-zk/mina-token-bridge/workers/defs";
import { JsonProof, NetworkId } from "o1js";

type TokenMintWorkerInst = InstanceType<
  ReturnType<typeof createProxy<typeof TokenMintWorkerType>>
>;

// Both of these need to be configurable env vars, will be different for production / production
const noriTokenControllerAddressBase58 =
  "B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs";
const noriTokenBaseBase58 =
  "B62qjRLSRy5M1eEndnDyvT9ND8wdiNE3UpnH1KSoTgQyEtwNgDfebxx";

export default class ZkappMintWorkerClient {
  #mintWorker: TokenMintWorkerInst;
  #ready: Promise<void> | undefined;
  #noriTokenControllerVerificationKeySafe:
    | {
        data: string;
        hashStr: string;
      }
    | undefined;

  constructor() {
    const worker = new Worker(new URL("./mintWorker.ts", import.meta.url), {
      type: "module",
    });
    const workerParent = new WorkerParent(worker);
    const TokenMintWorker =
      createProxy<typeof TokenMintWorkerType>(workerParent);
    this.#mintWorker = new TokenMintWorker();
    this.#ready = this.#mintWorker.ready;
    console.log("Worker proxy created in constructor");
  }

  // Terminate the worker when your done with it.
  terminate() {
    this.#mintWorker.terminate();
  }

  // Use this function to know if the worker has fully loaded. Method calls will be buffered until this resolves.
  // So you don't actually have to await this. You can use the worker methods straight away :)
  ready() {
    return this.#ready;
  }

  async compile() {
    this.#noriTokenControllerVerificationKeySafe =
      await this.#mintWorker.compileAll();
  }

  async needsToSetupStorage(minaSenderPublicKeyBase58: string) {
    return this.#mintWorker.needsToSetupStorage(
      noriTokenControllerAddressBase58,
      minaSenderPublicKeyBase58
    );
  }

  async setupStorage(minaSenderPublicKeyBase58: string) {
    if (!this.#noriTokenControllerVerificationKeySafe)
      throw new Error("Need to call compile before using this function.");
    // Get a json string of the proved setup storage transaction.
    const provedSetupTxStr = await this.#mintWorker.setupStorage(
      minaSenderPublicKeyBase58,
      noriTokenControllerAddressBase58,
      0.1 * 1e9,
      this.#noriTokenControllerVerificationKeySafe
    );
    return provedSetupTxStr;
  }

  async computeEthDeposit(
    presentationJsonStr: string,
    depositBlockNumber: number,
    ethAddressLowerHex: string
  ) {
    const ethDepositProofJson = await this.#mintWorker.computeEthDeposit(
      presentationJsonStr,
      depositBlockNumber,
      ethAddressLowerHex.toLowerCase() // Make sure its lower!
    );
    return ethDepositProofJson;
  }

  async computeMintTx(
    minaSenderPublicKeyBase58: string,
    ethDepositProofJson: JsonProof,
    presentationJsonStr: string
  ) {
    // Get a json string of a proven mint tx
    const provedMintTxStr = await this.#mintWorker.mint(
      minaSenderPublicKeyBase58,
      noriTokenControllerAddressBase58,
      {
        ethDepositProofJson: ethDepositProofJson,
        presentationProofStr: presentationJsonStr,
      },
      1e9 * 0.1,
      true
    );
    return provedMintTxStr;
  }

  async minaSetup(options: {
    networkId?: NetworkId;
    mina: string | string[];
    archive?: string | string[];
    lightnetAccountManager?: string;
    bypassTransactionLimits?: boolean;
    minaDefaultHeaders?: HeadersInit;
    archiveDefaultHeaders?: HeadersInit;
  }) {
    return this.#mintWorker.minaSetup(options);
  }

  async getBalanceOf(minaSenderPublicKeyBase58: string) {
    return this.#mintWorker.getBalanceOf(
      noriTokenBaseBase58,
      minaSenderPublicKeyBase58
    );
  }

  async mintedSoFar(minaSenderPublicKeyBase58: string) {
    return this.#mintWorker.mintedSoFar(
      noriTokenControllerAddressBase58,
      minaSenderPublicKeyBase58
    );
  }
}
