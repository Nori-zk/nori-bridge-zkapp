import { JsonProof, NetworkId } from "o1js";

// Mock implementation of ZkappMintWorkerClient for testing
export default class MockMintWorkerClient {
  #ready: Promise<void>;
  #terminated = false;
  #compiled = false;
  #minaSenderPublicKeyBase58: string;
  #ethAddress: string;
  #storageSetupDone = false;

  constructor(minaSenderPublicKeyBase58: string, ethAddress: string) {
    this.#minaSenderPublicKeyBase58 = minaSenderPublicKeyBase58;
    this.#ethAddress = ethAddress;
    // Simulate async initialization
    this.#ready = new Promise((resolve) => {
      setTimeout(() => {
        console.log(
          "Mock worker ready with eth:",
          ethAddress,
          " and mina: ",
          minaSenderPublicKeyBase58
        );
        resolve();
      }, 100);
    });
  }

  terminate() {
    this.#terminated = true;
    console.log("Mock worker terminated");
  }

  //TODO
  //initWorker with eth and mina address

  ready() {
    return this.#ready;
  }

  async compile() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    await this.minaSetup({});
    // Simulate compilation delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    this.#compiled = true;
    console.log("Mock worker compiled");

    return {
      data: "mock-verification-key-data",
      hashStr: "mock-verification-key-hash",
    };
  }

  async setupStorage() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled) await this.compile();

    // Simulate setup storage delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(`Mock setupStorage for ${this.#minaSenderPublicKeyBase58}`);
    this.#storageSetupDone = true;
    return JSON.stringify({
      kind: "setup-storage-tx",
      sender: this.#minaSenderPublicKeyBase58,
      timestamp: Date.now(),
    });
  }

  async computeEthDeposit(
    presentationJsonStr: string,
    depositBlockNumber: number
  ) {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled) await this.compile();

    // Simulate eth deposit computation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(
      `Mock computeEthDeposit for block ${depositBlockNumber}, eth: ${
        this.#ethAddress
      }`
    );

    return {
      publicInput: [depositBlockNumber.toString(), this.#ethAddress],
      publicOutput: [`mock-eth-proof-${depositBlockNumber}`],
      proof: `mock-proof-data-${Date.now()}`,
    } as JsonProof;
  }

  async computeMintTx(
    ethDepositProofJson: JsonProof,
    presentationJsonStr: string,
    needsToFundAccount: boolean
  ) {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled)
      throw new Error("Need to call compile before using this function.");

    // Simulate mint tx computation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log(
      `Mock computeMintTx for ${
        this.#minaSenderPublicKeyBase58
      }, needsToFundAccount: ${needsToFundAccount}`
    );

    return JSON.stringify({
      kind: "mint-tx",
      sender: this.#minaSenderPublicKeyBase58,
      ethDepositProof: ethDepositProofJson,
      timestamp: Date.now(),
      needsToFundAccount,
    });
  }

  async minaSetup(options: {
    networkId?: NetworkId;
    mina?: string | string[];
    archive?: string | string[];
    lightnetAccountManager?: string;
    bypassTransactionLimits?: boolean;
    minaDefaultHeaders?: HeadersInit;
    archiveDefaultHeaders?: HeadersInit;
  }) {
    if (this.#terminated) throw new Error("Worker has been terminated.");

    // Simulate mina setup delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log("Mock minaSetup completed", options);
    return true;
  }

  async needsToFundAccount() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled)
      throw new Error("Need to call compile before using this function.");

    // Simulate check delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Mock logic: return true for addresses ending in odd numbers
    const lastChar = this.#minaSenderPublicKeyBase58.slice(-1);
    const needsFunding = parseInt(lastChar, 36) % 2 === 1;

    console.log(
      `Mock needsToFundAccount for ${
        this.#minaSenderPublicKeyBase58
      }: ${needsFunding}`
    );
    return needsFunding;
  }

  //here we need to call Mina to check state on chain and kinda poll until its done or have poll ahppening
  async needsToSetupStorage() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    // if (!this.#compiled)
    //   throw new Error("Need to call compile before using this function.");
    if (!this.#compiled) await this.compile();

    // Simulate check delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(
      `Mock needsToSetupStorage for ${this.#minaSenderPublicKeyBase58}`
    );
    return !this.#storageSetupDone;
  }

  async getBalanceOf() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled)
      throw new Error("Need to call compile before using this function.");

    // Simulate balance check delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock balance based on address hash
    const hash = this.#minaSenderPublicKeyBase58.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const balance = Math.abs(hash % 10000) / 100; // Random balance 0-100 with 2 decimals

    console.log(
      `Mock getBalanceOf for ${this.#minaSenderPublicKeyBase58}: ${balance}`
    );
    return balance.toString();
  }

  async mintedSoFar() {
    if (this.#terminated) throw new Error("Worker has been terminated.");
    if (!this.#compiled)
      throw new Error("Need to call compile before using this function.");

    // Simulate minted amount check delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Mock minted amount based on stored data or default
    const stored = localStorage.getItem(
      `mock-minted-${this.#minaSenderPublicKeyBase58}`
    );
    const minted = stored ? parseFloat(stored) : 0;

    console.log(
      `Mock mintedSoFar for ${this.#minaSenderPublicKeyBase58}: ${minted}`
    );
    return minted.toString();
  }

  // Helper method to simulate minting (for testing)
  mockAddMintedAmount(amount: number) {
    const current = parseFloat(
      localStorage.getItem(`mock-minted-${this.#minaSenderPublicKeyBase58}`) ||
        "0"
    );
    localStorage.setItem(
      `mock-minted-${this.#minaSenderPublicKeyBase58}`,
      (current + amount).toString()
    );
  }
}
