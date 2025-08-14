import * as Comlink from "comlink";

export default class ZkappWorkerClient {
  // ---------------------------------------------------------------------------------------
  worker: Worker;
  // Proxy to interact with the worker's methods as if they were local
  remoteApi: Comlink.Remote<typeof import("@/workers/zkappWorker.ts").api>;

  constructor() {
    console.log('initing worker');
    // Initialize the worker from the zkappWorker module
    const worker = new Worker(new URL("./zkappWorker.ts", import.meta.url), {
      type: "module",
    });
    console.log('inited worker');
    // Wrap the worker with Comlink to enable direct method invocation
    this.remoteApi = Comlink.wrap(worker);
  }

  async createEcdsaCredential(
    message: string,
    publicKey: string,
    signature: string,
    walletAddress: string
  ): Promise<string> {
    return await this.remoteApi.createEcdsaCredential(
      message,
      publicKey,
      signature,
      walletAddress
    );
  }

  async initialiseCredential(): Promise<boolean> {
    // Placeholder for any initialization logic if needed
    const result = await this.remoteApi.initialiseCredential();
    console.log("Worker client initCred value:", result);
    return result;
  }

  /*async loadTokenContracts(): Promise<void> {
    console.log("Worker client loadTokenContracts called.");
    await this.remoteApi.loadContracts({});
  }*/

  /*async initialiseTokenContracts(
    tokenAddress: string,
    controllerAddress: string
  ): Promise<boolean> {
    // Placeholder for token contract initialization logic
    const result = await this.remoteApi.initContractsInstance({
      tokenAddress: tokenAddress,
      controllerAddress: controllerAddress,
    });
    console.log("Worker client initialiseTokenContracts called.");
    return result;
  }*/

  async obtainPresentationRequest(): Promise<string> {
    try {
      const credential = await this.remoteApi.obtainPresentationRequest();
      console.log("Worker client obtainPresentationRequest called.");
      return credential;
    } catch (error) {
      console.error("Error obtainPresentationRequest from worker:", error);
      throw error;
    }
  }
}
