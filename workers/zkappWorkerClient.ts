import { createProxyFromSpec } from "@nori-zk/mina-token-bridge/worker";
import { WorkerParent } from "@nori-zk/mina-token-bridge/browser/worker/parent";
import { CredentialAttestationWorkerSpec } from "@nori-zk/mina-token-bridge/workers/specs";

const noriTokenControllerAddressBase58 =
  "B62qjjbAsmyjEYkUQQbwzVLBxUc66cLp48vxgT582UxK15t1E3LPUNs"; // This should be an env var! Will change in testnet vs production

export default class ZkappWorkerClient {
  #credentialAttestationWorker: ReturnType<
    typeof createProxyFromSpec<typeof CredentialAttestationWorkerSpec>
  >;

  #ready: Promise<void> | undefined;

  // Use this function to know if the worker has fully loaded. Method calls will be buffered until this resolves.
  ready() {
    return this.#ready;
  }

  constructor() {
    const worker = new Worker(new URL("./zkappWorker.ts", import.meta.url), {
      type: "module",
    });

    const workerParent = new WorkerParent(worker);

    this.#ready = workerParent.ready();

    this.#credentialAttestationWorker = createProxyFromSpec(
      workerParent,
      CredentialAttestationWorkerSpec
    );

    console.log("Worker proxy created in constructor");
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
