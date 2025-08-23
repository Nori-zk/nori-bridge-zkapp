import {
	// assign,
	fromObservable,
	fromPromise,
	setup,
	// type StateMachine,
	// type AnyStateMachine,
} from "xstate";
import { Observable } from "rxjs";
import { JsonProof, NetworkId } from "o1js";
// Import actual bridge deposit observables
import {
	getBridgeStateTopic$,
	getBridgeTimingsTopic$,
	getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
	// BridgeDepositProcessingStatus,
	getDepositProcessingStatus$,
	getCanMint$,
	// CanMintStatus,
	getCanComputeEthProof$,
	// canComputeEthProof,
} from "@nori-zk/mina-token-bridge/rx/deposit";
import MockMintWorkerClient from "@/workers/mockMintWorkerClient.ts";
// Storage helpers (safe SSR)
const safeLS = {
	get: (k: string): string | null =>
		typeof window === "undefined" ? null : window.localStorage.getItem(k),
	set: (k: string, v: string) => {
		if (typeof window !== "undefined") window.localStorage.setItem(k, v);
	},
	del: (k: string) => {
		if (typeof window !== "undefined") window.localStorage.removeItem(k);
	},
};

export const LS_KEYS = {
	activeDepositNumber: "activeDepositNumber",
	computedEthProof: "computedEthProof",
	depositMintTx: "depositMintTx",
	// isStorageSetup: "isStorageSetup",
} as const;

type ObservableValue<T> = T extends Observable<infer U> ? U : never;
// Machine Context
export interface DepositMintContext {
	// Core deposit data
	activeDepositNumber: number | null;
	computedEthProof: JsonProof | null;
	depositMintTx: string | null;

	// Observable states
	processingStatus: ObservableValue<
		ReturnType<typeof getDepositProcessingStatus$>
	> | null;
	canComputeStatus: ObservableValue<
		ReturnType<typeof getCanComputeEthProof$>
	> | null;
	canMintStatus: ObservableValue<ReturnType<typeof getCanMint$>> | null;

	// Bridge topics (observables)
	ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
	bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
	bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;

	// Worker and user data
	mintWorker: MockMintWorkerClient | null;
	minaSenderAddress: string | null;
	ethSenderAddress: string | null;
	presentationJsonStr: string | null;

	// Status flags
	isWorkerReady: boolean;
	isStorageSetup: boolean;
	needsToFundAccount: boolean;

	// Error handling
	errorMessage: string | null;
}

// export type DepositMintEvents =
// 	| { type: "SET_DEPOSIT_NUMBER"; value: number }
// 	| { type: "SET_USER_ADDRESSES"; minaAddress: string; ethAddress: string }
// 	| { type: "SET_PRESENTATION"; presentationJsonStr: string }
// 	| { type: "INIT_WORKER" }
// 	| { type: "SETUP_STORAGE" }
// 	| { type: "SUBMIT_MINT_TX" }
// 	| { type: "RETRY" }
// 	| { type: "RESET" };
export type DepositMintEvents =
	| { type: "SET_DEPOSIT_NUMBER"; value: number }
	| { type: "CHECK_STATUS" }
	| { type: "COMPUTE_ETH_PROOF" }
	| { type: "BUILD_MINT_TX" }
	| { type: "SUBMIT_MINT_TX" }
	| { type: "RESET" };

//Actors from observables
const depositProcessingStatusActor = fromObservable(
	({
		input,
	}: {
		input: {
			depositBlockNumber: number;
			ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
			bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
			bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
		};
	}) => {
		return getDepositProcessingStatus$(
			input.depositBlockNumber,
			input.ethStateTopic$,
			input.bridgeStateTopic$,
			input.bridgeTimingsTopic$
		);
	}
);

const canComputeEthProofActor = fromObservable(
	({
		input,
	}: {
		input: {
			depositBlockNumber: number;
			ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
			bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
			bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
		};
	}) => {
		return getCanComputeEthProof$(
			getDepositProcessingStatus$(
				input.depositBlockNumber,
				input.ethStateTopic$,
				input.bridgeStateTopic$,
				input.bridgeTimingsTopic$
			)
		);
	}
);

const canMintActor = fromObservable(
	({
		input,
	}: {
		input: {
			depositBlockNumber: number;
			ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
			bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
			bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
		};
	}) => {
		return getCanMint$(
			getDepositProcessingStatus$(
				input.depositBlockNumber,
				input.ethStateTopic$,
				input.bridgeStateTopic$,
				input.bridgeTimingsTopic$
			)
		);
	}
);

// Promise actors for worker operations
const initWorker = fromPromise(async () => {
	const worker = new MockMintWorkerClient();
	await worker.ready();
	console.log("Mock worker initialized");
	return worker;
});

const minaSetup = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
			networkId?: NetworkId;
			mina: string | string[];
			archive?: string | string[];
			lightnetAccountManager?: string;
			bypassTransactionLimits?: boolean;
			minaDefaultHeaders?: HeadersInit;
			archiveDefaultHeaders?: HeadersInit;
		};
	}) => {
		await input.worker.compile();
		return true;
	}
);
const compileWorker = fromPromise(
	async ({ input }: { input: { worker: MockMintWorkerClient } }) => {
		await input.worker.compile();
		return true;
	}
);

const checkStorageSetup = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
			minaSenderAddress: string;
		};
	}) => {
		const [needsSetup, needsFunding] = await Promise.all([
			input.worker.needsToSetupStorage(input.minaSenderAddress),
			input.worker.needsToFundAccount(input.minaSenderAddress),
		]);

		return {
			needsSetup,
			needsFunding,
			isStorageSetup: !needsSetup,
		};
	}
);

const setupStorage = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
			minaSenderAddress: string;
		};
	}) => {
		const txStr = await input.worker.setupStorage(input.minaSenderAddress);

		// Mock completion for testing
		input.worker.mockCompleteSetupStorage(input.minaSenderAddress);

		// Mark as setup in localStorage
		// safeLS.set(LS_KEYS.isStorageSetup, "true");
		return txStr;
	}
);

const computeEthProof = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
			depositBlockNumber: number;
			ethSenderAddress: string;
			presentationJsonStr: string;
		};
	}) => {
		const ethProof = await input.worker.computeEthDeposit(
			input.presentationJsonStr,
			input.depositBlockNumber,
			input.ethSenderAddress
		);

		// Store in localStorage
		safeLS.set(LS_KEYS.computedEthProof, JSON.stringify(ethProof));
		// safeLS.set(LS_KEYS.lastEthProofCompute, Date.now().toString());

		return ethProof;
	}
);

const computeMintTx = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
			minaSenderAddress: string;
			ethProof: JsonProof;
			presentationJsonStr: string;
			needsToFundAccount: boolean;
		};
	}) => {
		const mintTxStr = await input.worker.computeMintTx(
			input.minaSenderAddress,
			input.ethProof,
			input.presentationJsonStr,
			input.needsToFundAccount
		);

		// Store in localStorage
		safeLS.set(LS_KEYS.depositMintTx, mintTxStr);
		return mintTxStr;
	}
);

export const getDepositMachine = (topics: {
	ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
	bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
	bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
}) =>
	setup({
		types: {
			context: {} as DepositMintContext,
			events: {} as DepositMintEvents,
		},
		guards: {
			//TODO
		},
		actors: {
			depositProcessingStatusActor,
			canComputeEthProofActor,
			canMintActor,
			initWorker,
			minaSetup,
			compileWorker,
			checkStorageSetup,
			setupStorage,
			computeEthProof,
			computeMintTx,
		},
	}).createMachine({
		id: "depositMint",
		initial: "checking",
		context: {
			activeDepositNumber: (() => {
				const v = safeLS.get(LS_KEYS.activeDepositNumber);
				if (v) return parseInt(v);
				return null;
			})(),
			computedEthProof: (() => {
				const v = safeLS.get(LS_KEYS.computedEthProof);
				if (v) return JSON.parse(v); // would that parse correctly?
				return null;
			})() as JsonProof | null,
			depositMintTx: safeLS.get(LS_KEYS.depositMintTx),

			processingStatus: null,
			canComputeStatus: null,
			canMintStatus: null,
			ethStateTopic$: topics.ethStateTopic$,
			bridgeStateTopic$: topics.bridgeStateTopic$,
			bridgeTimingsTopic$: topics.bridgeTimingsTopic$,
			mintWorker: null, // maybe actually do set it up here?
			minaSenderAddress: null,
			ethSenderAddress: null,
			presentationJsonStr: null,
			isWorkerReady: false,
			isStorageSetup: false,
			needsToFundAccount: false,
			errorMessage: null,
		},
		states: {},
		on: {},
	});
