import {
	assign,
	// assign,
	fromObservable,
	fromPromise,
	setup,
	// type StateMachine,
	// type AnyStateMachine,
} from "xstate";
import { Observable } from "rxjs";
import { JsonProof } from "o1js";
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
	// minaSenderAddress: string | null;
	// ethSenderAddress: string | null;
	presentationJsonStr: string | null;

	// Status flags
	isWorkerReady: boolean;
	isStorageSetup: boolean;
	// isMinaSetupComplete: boolean;
	// isWorkerCompiled: boolean;
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
const initWorker = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
		};
	}) => {
		const readyWorker = await input.worker.ready();
		console.log("Mock worker initialized");
		return readyWorker;
	}
);

// const minaSetup = fromPromise(
// 	async ({
// 		input,
// 	}: {
// 		input: {
// 			worker: MockMintWorkerClient;
// 		};
// 	}) => {
// 		await input.worker.minaSetup({});
// 		console.log("Actor Mina setup completed");
// 		return true;
// 	}
// );
// const compileWorker = fromPromise(
// 	async ({ input }: { input: { worker: MockMintWorkerClient } }) => {
// 		await input.worker.compile();
// 		console.log("Actor worker compilation completed");
// 		return true;
// 	}
// );

const checkStorageSetup = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
		};
	}) => {
		console.log("Checking if storage setup is needed...");
		await input.worker.needsToSetupStorage();
		// const [needsSetup, needsFunding] = await Promise.all([
		// 	input.worker.needsToSetupStorage(input.minaSenderAddress),
		// 	input.worker.needsToFundAccount(input.minaSenderAddress),
		// ]);

		return {
			needsSetup: await input.worker.needsToSetupStorage(),
			// needsFunding: true,
			// isStorageSetup: false, // that cannot always return false
		};
	}
);

const setupStorage = fromPromise(
	async ({
		input,
	}: {
		input: {
			worker: MockMintWorkerClient;
		};
	}) => {
		const txStr = await input.worker.setupStorage();
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
			presentationJsonStr: string;
		};
	}) => {
		const ethProof = await input.worker.computeEthDeposit(
			input.presentationJsonStr,
			input.depositBlockNumber
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
			ethProof: JsonProof; // from localStorage
			presentationJsonStr: string; //from localStorage
			needsToFundAccount: boolean;
		};
	}) => {
		const mintTxStr = await input.worker.computeMintTx(
			input.ethProof,
			input.presentationJsonStr,
			input.needsToFundAccount
		);

		// Store in localStorage
		safeLS.set(LS_KEYS.depositMintTx, mintTxStr);
		return mintTxStr; //JSON of tx that we need to send to wallet - to componet/provider
	}
);
const submitMintTx = fromPromise(
	async ({ input }: { input: { mintTx: string } }) => {
		// In a real implementation, this would submit the transaction to the Mina network
		console.log("Submitting mint transaction:", input.mintTx);
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 2000));
		console.log("Mint transaction submitted successfully");
		return true;
	}
);

export const getDepositMachine = (
	topics: {
		ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
		bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
		bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
	},
	mintWorker: MockMintWorkerClient
) =>
	setup({
		types: {
			context: {} as DepositMintContext,
			events: {} as DepositMintEvents,
		},
		guards: {
			hasComputedEthProof: ({ context }) => context.computedEthProof !== null,
			hasDepositMintTx: ({ context }) => context.depositMintTx !== null,
			hasActiveDepositNumber: ({ context }) =>
				context.activeDepositNumber !== null,
			hasWorker: ({ context }) => context.isWorkerReady === true,
			canComputeEthProof: ({ context }) =>
				context.canComputeStatus === "CanCompute",
			canMint: ({ context }) => context.canMintStatus === "ReadyToMint",
			isMissedOpportunity: ({ context }) =>
				context.canComputeStatus === "MissedMintingOpportunity" ||
				context.canMintStatus === "MissedMintingOpportunity",
			needsStorageSetup: ({ context }) => !context.isStorageSetup,
			// isMinaSetupComplete: ({ context }) => context.isMinaSetupComplete,
			// isWorkerCompiled: ({ context }) => context.isWorkerCompiled,
		},
		actors: {
			depositProcessingStatusActor,
			canComputeEthProofActor,
			canMintActor,
			initWorker,
			// minaSetup,
			// compileWorker,
			checkStorageSetup,
			setupStorage,
			computeEthProof,
			computeMintTx,
			submitMintTx,
		},
	}).createMachine({
		id: "depositMint",
		initial: "hydrating",
		context: {
			// Initialize with null to prevent hydration mismatch
			activeDepositNumber: null,
			computedEthProof: null,
			depositMintTx: null,

			processingStatus: null,
			canComputeStatus: null,
			canMintStatus: null,
			ethStateTopic$: topics.ethStateTopic$,
			bridgeStateTopic$: topics.bridgeStateTopic$,
			bridgeTimingsTopic$: topics.bridgeTimingsTopic$,
			mintWorker: mintWorker || null, // Use passed worker or null
			// minaSenderAddress: null,
			// ethSenderAddress: null,
			presentationJsonStr: null,
			isWorkerReady: false,
			isStorageSetup: false,
			// isMinaSetupComplete: false,
			// isWorkerCompiled: false,
			needsToFundAccount: false,
			errorMessage: null,
		},
		states: {
			// Initial hydration state - same on server and client
			hydrating: {
				after: {
					0: "checking", // Immediately transition to checking after mount
				},
			},

			// Boot: hydrate state and determine next steps
			checking: {
				entry: assign({
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
					errorMessage: null,
				}),
				always: [
					{
						target: "hasComputedEthProof",
						guard: "hasComputedEthProof",
					},
					{ target: "hasDepositMintTx", guard: "hasDepositMintTx" },
					{
						target: "hasActiveDepositNumber",
						guard: "hasActiveDepositNumber",
					},
					{ target: "noActiveDepositNumber" },
				],
			},
			// User needs to configure deposit number
			noActiveDepositNumber: {
				on: {
					SET_DEPOSIT_NUMBER: {
						target: "hasActiveDepositNumber",
						actions: assign({
							activeDepositNumber: ({ event }) => {
								console.log("Setting activeDepositNumber:", event.value);
								safeLS.set(LS_KEYS.activeDepositNumber, event.value.toString());
								return event.value;
							},
						}),
					},
				},
			},

			hasActiveDepositNumber: {
				entry: assign({
					processingStatus: () => null as null,
					canComputeStatus: () => null as null,
					canMintStatus: () => null as null,
					errorMessage: null,
				}),
				always: [
					{
						target: "monitoringDepositStatus",
						guard: ({ context }) =>
							context.isWorkerReady &&
							// context.isMinaSetupComplete &&
							// context.isWorkerCompiled &&
							context.isStorageSetup,
					},
					{
						target: "checkingStorageSetup",
						// guard: ({ context }) =>
						// 	context.isWorkerReady &&
						// 	// context.isMinaSetupComplete &&
						// 	// context.isWorkerCompiled &&
						// 	!context.isStorageSetup,
					},
					// {
					// 	target: "compilingWorker",
					// 	guard: ({ context }) =>
					// 		context.isWorkerReady &&
					// 		// context.isMinaSetupComplete &&
					// 		// !context.isWorkerCompiled,
					// },
					// {
					// 	target: "initializingMina",
					// 	guard: ({ context }) =>
					// 		context.isWorkerReady
					// 	//  && !context.isMinaSetupComplete,
					// },
					// {
					// 	target: "needsWorkerInit",
					// },
				],
			},

			// Step 1: Check if storage setup is needed
			checkingStorageSetup: {
				invoke: {
					src: "checkStorageSetup",
					input: ({ context }) => ({
						worker: context.mintWorker!,
					}),
					onDone: {
						actions: assign({
							isStorageSetup: ({ event }) => event.output.needsSetup,
							// needsToFundAccount: ({ event }) => event.output.needsFunding,

							needsToFundAccount: ({}) => true,
						}),
						target: "storageSetupDecision",
					},
					onError: {
						target: "error",
						actions: assign({
							errorMessage: "Failed to check storage setup",
						}),
					},
				},
			},

			//bit wrong FIXME
			// Decision point: setup storage or proceed
			storageSetupDecision: {
				always: [
					{
						target: "settingUpStorage",
						guard: "needsStorageSetup",
					},
					{
						target: "monitoringDepositStatus",
					},
				],
			},

			//this has to return a transactionJSON so you send it to wallet
			// maybe set it in context and read it in provider/component
			//submit the storage setup tx from there
			// TODO and loop on 'needsStorageSetup' until false
			// Setup storage if needed
			settingUpStorage: {
				invoke: {
					src: "setupStorage",
					input: ({ context }) => ({
						worker: context.mintWorker!,
						// minaSenderAddress: context.minaSenderAddress!,
					}),
					onDone: {
						target: "monitoringDepositStatus",
						actions: assign({
							isStorageSetup: true,
						}),
					},
					onError: {
						target: "error",
						actions: assign({
							errorMessage: "Failed to setup storage",
						}),
					},
				},
			},

			// Now monitor deposit status and proceed accordingly
			monitoringDepositStatus: {
				invoke: [
					{
						id: "depositProcessingStatus",
						src: "depositProcessingStatusActor",
						input: ({ context }) => ({
							depositBlockNumber: context.activeDepositNumber!,
							ethStateTopic$: context.ethStateTopic$!,
							bridgeStateTopic$: context.bridgeStateTopic$!,
							bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
						}),
						onSnapshot: {
							actions: assign({
								processingStatus: ({ event }) => {
									console.log(
										"onSnapshotdepositProcessingStatus",
										event.snapshot.context
									);
									return event.snapshot.context ?? null;
								},
							}),
						},
					},
					{
						id: "canComputeEthProof",
						src: "canComputeEthProofActor",
						input: ({ context }) => ({
							depositBlockNumber: context.activeDepositNumber!,
							ethStateTopic$: context.ethStateTopic$!,
							bridgeStateTopic$: context.bridgeStateTopic$!,
							bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
						}),
						onSnapshot: {
							actions: assign({
								canComputeStatus: ({ event }) => {
									console.log("onSnapshotcanComputeEthProof", event);
									return event.snapshot.context ?? null;
								},
							}),
						},
					},
					{
						id: "canMint",
						src: "canMintActor",
						input: ({ context }) => ({
							depositBlockNumber: context.activeDepositNumber!,
							ethStateTopic$: context.ethStateTopic$!,
							bridgeStateTopic$: context.bridgeStateTopic$!,
							bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
						}),
						onSnapshot: {
							actions: assign({
								canMintStatus: ({ event }) => {
									console.log("onSnapshotcanMintActor", event);
									return event.snapshot.context ?? null;
								},
							}),
						},
					},
				],
				always: [
					{
						target: "computingEthProof",
						guard: "canComputeEthProof",
					},
					{
						target: "missedOpportunity",
						guard: "isMissedOpportunity",
					},
				],
			},

			computingEthProof: {
				invoke: {
					src: "computeEthProof",
					input: ({ context }) => ({
						worker: context.mintWorker!,
						depositBlockNumber: context.activeDepositNumber!,
						// ethSenderAddress: context.ethSenderAddress!,
						presentationJsonStr: context.presentationJsonStr!,
					}),
					onDone: {
						actions: assign({
							computedEthProof: ({ event }) => {
								const proof = event.output;
								window.localStorage.setItem(
									"computedEthProof",
									JSON.stringify(proof)
								);
								return proof;
							},
						}),
						target: "hasActiveDepositNumber", //TODO go to monitoringDepositStatus
					},
					onError: {
						target: "error",
						actions: assign({
							errorMessage: "Failed to compute ETH proof",
						}),
					},
				},
			},

			hasComputedEthProof: {
				entry: assign({
					canMintStatus: () => null as null,
				}),
				invoke: {
					src: "canMintActor",
					input: ({ context }) => ({
						depositBlockNumber: context.activeDepositNumber!,
						ethStateTopic$: context.ethStateTopic$!,
						bridgeStateTopic$: context.bridgeStateTopic$!,
						bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
					}),
					onSnapshot: {
						actions: assign({
							canMintStatus: ({ event }) => event.snapshot.context ?? null,
						}),
					},
				},
				always: [
					{ target: "buildingMintTx", guard: "canMint" },
					{
						target: "missedOpportunity",
						guard: "isMissedOpportunity",
					},
					{ target: "hasComputedEthProof" },
				],
			},
			buildingMintTx: {
				invoke: {
					src: "computeMintTx",
					input: ({ context }) => ({
						worker: context.mintWorker!,
						// minaSenderAddress: context.minaSenderAddress!,
						ethProof: context.computedEthProof!,
						presentationJsonStr: context.presentationJsonStr!,
						needsToFundAccount: context.needsToFundAccount,
					}),
					onDone: {
						actions: assign({
							depositMintTx: ({ event }) => {
								const tx = event.output;
								window.localStorage.setItem("depositMintTx", tx);
								return tx;
							},
						}),
						target: "checking",
					},
					onError: {
						target: "error",
						actions: assign({
							errorMessage: "Failed to build mint transaction",
						}),
					},
				},
			},
			hasDepositMintTx: {
				on: {
					SUBMIT_MINT_TX: {
						target: "submittingMintTx",
					},
				},
			},
			//todo don't think we do submit by the machine, we submit as soon as we get TX json from step before
			submittingMintTx: {
				invoke: {
					src: "submitMintTx",
					input: ({ context }) => ({
						mintTx: context.depositMintTx!,
					}),
					onDone: {
						target: "completed",
						actions: () => {
							window.localStorage.removeItem("activeDepositNumber");
							window.localStorage.removeItem("depositMintTx");
							window.localStorage.removeItem("computedEthProof");
						},
					},
					onError: {
						target: "error",
						actions: assign({
							errorMessage: "Failed to submit mint transaction",
						}),
					},
				},
			},

			// // Error state for handling failures
			error: {
				on: {
					RESET: {
						target: "checking",
					},
				},
			},

			missedOpportunity: {
				type: "final",
				entry: () => console.log("Missed minting opportunity"), // here we should most likley clear localStorage and context
			},

			completed: {
				type: "final",
				entry: () => console.log("Deposit completed successfully"),
			},
		},
		// Global reset handler - works from any state
		on: {
			RESET: {
				target: ".checking",
				actions: assign({
					activeDepositNumber: null,
					depositMintTx: null,
					computedEthProof: null,
					processingStatus: null,
					canComputeStatus: null,
					canMintStatus: null,
					mintWorker: null,
					// minaSenderAddress: null,
					// ethSenderAddress: null,
					presentationJsonStr: null,
					isWorkerReady: false,
					isStorageSetup: false,
					needsToFundAccount: false,
					errorMessage: null,
				}),
				entry: () => {
					// Clear localStorage on reset
					safeLS.del(LS_KEYS.activeDepositNumber);
					safeLS.del(LS_KEYS.computedEthProof);
					safeLS.del(LS_KEYS.depositMintTx);
				},
			},
		},
	});
