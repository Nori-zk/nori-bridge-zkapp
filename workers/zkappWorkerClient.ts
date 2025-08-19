import { createProxy } from "@nori-zk/workers";
import { WorkerParent } from "@nori-zk/workers/browser/parent";
import { type CredentialAttestationWorker as CredentialAttestationWorkerType } from "@nori-zk/mina-token-bridge/workers/defs";

type CredentialAttestationWorkerInst = InstanceType<
  ReturnType<typeof createProxy<typeof CredentialAttestationWorkerType>>
>;

const noriTokenControllerAddressBase58 =
  "B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs"; // This should be an env var! Will change in testnet vs production

export default class ZkappWorkerClient {
  #credentialAttestationWorker: CredentialAttestationWorkerInst;
  #ready: Promise<void> | undefined;

  constructor() {
    const worker = new Worker(new URL("./zkappWorker.ts", import.meta.url), {
      type: "module",
    });
    const workerParent = new WorkerParent(worker);
    const CredentialAttestationWorker =
      createProxy<typeof CredentialAttestationWorkerType>(workerParent);
    this.#credentialAttestationWorker = new CredentialAttestationWorker();
    this.#ready = this.#credentialAttestationWorker.ready;
    console.log("Worker proxy created in constructor");
  }

  // Terminate the worker when your done with it.
  terminate() {
    this.#credentialAttestationWorker.terminate();
  }

  // Use this function to know if the worker has fully loaded. Method calls will be buffered until this resolves.
  // So you don't actually have to await this. You can use the worker methods straight away :)
  ready() {
    return this.#ready;
  }

  async createEcdsaCredential(
    message: string,
    publicKey: string,
    signature: string,
    walletAddress: string
  ): Promise<string> {
    return await this.#credentialAttestationWorker.computeCredential(
      message,
      signature,
      publicKey,
      walletAddress
    );
  }

  async initialiseCredential(): Promise<boolean> {
    const result = await this.#credentialAttestationWorker.compile();
    console.log("Worker client initCred value:", result);
    return true;
  }

  async obtainPresentationRequest(): Promise<string> {
    try {
      const credential =
        await this.#credentialAttestationWorker.computeEcdsaSigPresentationRequest(
          noriTokenControllerAddressBase58
        );
      console.log("Worker client obtainPresentationRequest called.");
      return credential;
    } catch (error) {
      console.error("Error obtainPresentationRequest from worker:", error);
      throw error;
    }
  }
}
