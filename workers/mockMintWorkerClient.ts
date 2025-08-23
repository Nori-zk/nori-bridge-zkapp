import { JsonProof, NetworkId } from "o1js";

// Mock implementation of ZkappMintWorkerClient for testing
export default class MockMintWorkerClient {
	#ready: Promise<void>;
	#terminated = false;
	#compiled = false;

	constructor() {
		// Simulate async initialization
		this.#ready = new Promise((resolve) => {
			setTimeout(() => {
				console.log("Mock worker ready");
				resolve();
			}, 100);
		});
	}

	terminate() {
		this.#terminated = true;
		console.log("Mock worker terminated");
	}

	ready() {
		return this.#ready;
	}

	async compile() {
		if (this.#terminated) throw new Error("Worker has been terminated.");

		// Simulate compilation delay
		await new Promise((resolve) => setTimeout(resolve, 3000));

		this.#compiled = true;
		console.log("Mock worker compiled");

		return {
			data: "mock-verification-key-data",
			hashStr: "mock-verification-key-hash",
		};
	}

	async setupStorage(minaSenderPublicKeyBase58: string) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate setup storage delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log(`Mock setupStorage for ${minaSenderPublicKeyBase58}`);

		return JSON.stringify({
			kind: "setup-storage-tx",
			sender: minaSenderPublicKeyBase58,
			timestamp: Date.now(),
		});
	}

	async computeEthDeposit(
		presentationJsonStr: string,
		depositBlockNumber: number,
		ethAddressLowerHex: string
	) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate eth deposit computation delay
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log(
			`Mock computeEthDeposit for block ${depositBlockNumber}, eth: ${ethAddressLowerHex}`
		);

		return {
			publicInput: [depositBlockNumber.toString(), ethAddressLowerHex],
			publicOutput: [`mock-eth-proof-${depositBlockNumber}`],
			proof: `mock-proof-data-${Date.now()}`,
		} as JsonProof;
	}

	async computeMintTx(
		minaSenderPublicKeyBase58: string,
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
			`Mock computeMintTx for ${minaSenderPublicKeyBase58}, needsToFundAccount: ${needsToFundAccount}`
		);

		return JSON.stringify({
			kind: "mint-tx",
			sender: minaSenderPublicKeyBase58,
			ethDepositProof: ethDepositProofJson,
			timestamp: Date.now(),
			needsToFundAccount,
		});
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
		if (this.#terminated) throw new Error("Worker has been terminated.");

		// Simulate mina setup delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		console.log("Mock minaSetup completed", options);
		return true;
	}

	async needsToFundAccount(minaSenderPublicKeyBase58: string) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate check delay
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Mock logic: return true for addresses ending in odd numbers
		const lastChar = minaSenderPublicKeyBase58.slice(-1);
		const needsFunding = parseInt(lastChar, 36) % 2 === 1;

		console.log(
			`Mock needsToFundAccount for ${minaSenderPublicKeyBase58}: ${needsFunding}`
		);
		return needsFunding;
	}

	async needsToSetupStorage(minaSenderPublicKeyBase58: string) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate check delay
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Mock logic: check if setup was done recently (within last 5 minutes)
		const lastSetup = localStorage.getItem(
			`mock-setup-storage-${minaSenderPublicKeyBase58}`
		);
		if (!lastSetup) return true;

		const lastSetupTime = parseInt(lastSetup);
		const needsSetup = Date.now() - lastSetupTime > 5 * 60 * 1000; // 5 minutes

		console.log(
			`Mock needsToSetupStorage for ${minaSenderPublicKeyBase58}: ${needsSetup}`
		);
		return needsSetup;
	}

	async getBalanceOf(minaSenderPublicKeyBase58: string) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate balance check delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Mock balance based on address hash
		const hash = minaSenderPublicKeyBase58.split("").reduce((a, b) => {
			a = (a << 5) - a + b.charCodeAt(0);
			return a & a;
		}, 0);

		const balance = Math.abs(hash % 10000) / 100; // Random balance 0-100 with 2 decimals

		console.log(
			`Mock getBalanceOf for ${minaSenderPublicKeyBase58}: ${balance}`
		);
		return balance.toString();
	}

	async mintedSoFar(minaSenderPublicKeyBase58: string) {
		if (this.#terminated) throw new Error("Worker has been terminated.");
		if (!this.#compiled)
			throw new Error("Need to call compile before using this function.");

		// Simulate minted amount check delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Mock minted amount based on stored data or default
		const stored = localStorage.getItem(
			`mock-minted-${minaSenderPublicKeyBase58}`
		);
		const minted = stored ? parseFloat(stored) : 0;

		console.log(`Mock mintedSoFar for ${minaSenderPublicKeyBase58}: ${minted}`);
		return minted.toString();
	}

	// Helper method to simulate successful setup storage (for testing)
	mockCompleteSetupStorage(minaSenderPublicKeyBase58: string) {
		localStorage.setItem(
			`mock-setup-storage-${minaSenderPublicKeyBase58}`,
			Date.now().toString()
		);
	}

	// Helper method to simulate minting (for testing)
	mockAddMintedAmount(minaSenderPublicKeyBase58: string, amount: number) {
		const current = parseFloat(
			localStorage.getItem(`mock-minted-${minaSenderPublicKeyBase58}`) || "0"
		);
		localStorage.setItem(
			`mock-minted-${minaSenderPublicKeyBase58}`,
			(current + amount).toString()
		);
	}
}
