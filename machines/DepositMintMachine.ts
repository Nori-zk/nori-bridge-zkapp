"use client"; // The server cannot use this machine! Should build a seperate machine for other purposes
import { assign, setup, log, ErrorActorEvent } from "xstate";
// Import actual bridge deposit observables
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  getCanMint$,
  getCanComputeEthProof$,
} from "@nori-zk/mina-token-bridge/rx/deposit";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import {
  CompressedDepositSnapshotEvent,
  getCompressedDepositProcessingStatus$,
  getDepositProcessingStatus,
} from "@/machines/actors/statuses.ts";
import { EthProofResult, ObservableValue } from "./types.ts";
import { compressedDepositProcessingStatusActor } from "@/machines/actors/statuses.ts";
import {
  canComputeEthProofActor,
  canMintActor,
  storageIsSetupWithDelayActor,
} from "@/machines/actors/triggers.ts";
import {
  checkStorageSetupOnChain,
  setupStorage,
  computeEthProof,
  computeMintTx,
  submitMintTx,
  submitSetupStorage,
} from "@/machines/actors/actions.ts";
// eslint-disable-next-line
import _ from "@/node_modules/xstate/dist/declarations/src/guards.js"; // this is just to supress the xstate guards ref needed.
import { type getDepositProcessingStatus$ } from "./obs/getDepositProcessingStatus$.ts";
import {
  isSetupStorageInProgressForMinaKey,
  resetLocalStorage,
  storageIsSetupAndFinalizedForCurrentMinaKey,
  Store,
} from "@/helpers/localStorage2.ts";
// Commonly used invoke procedures

// This invoke entry will update the machine context when the deposit status changes can be used in any node.
const invokeMonitoringDepositStatus = {
  id: "compressedDepositProcessingStatus",
  src: "compressedDepositProcessingStatusActor" as const,
  input: ({ context }: { context: DepositMintContext }) =>
    ({
      compressedDepositProcessingStatus$:
        context.compressedDepositProcessingStatus$!,
    } as const),
  onSnapshot: {
    actions: assign<
      DepositMintContext,
      CompressedDepositSnapshotEvent,
      undefined,
      DepositMintEvents,
      never
    >({
      processingStatus: ({ event }) => {
        return event.snapshot.context ?? null;
      },
    }),
  } as const,
  onError: {
    //@ts-expect-error as any
    actions: ({ event }) => {
      console.error("compressedDepositProcessingStatus error:", event.error);
    },
  },
};

function getErrorReason(event: ErrorActorEvent<unknown, string>) {
  if (
    typeof event.error === "object" &&
    event.error !== null &&
    "message" in event.error &&
    typeof event.error.message === "string"
  ) {
    return event.error.message;
  }
  return "Unknown reason...";
}

// Error handler factory - reduces duplication across all error handlers
function createErrorHandler(
  errorMessage: string,
  targetState: string = "checkingDelay",
) {
  return {
    target: targetState,
    actions: [
      assign({
        error: ({ event }: { event: ErrorActorEvent<unknown, string> }) => ({
          message: errorMessage,
          reason: getErrorReason(event),
          timestamp: Date.now(),
        }),
      }),
      ({ event }: { event: ErrorActorEvent<unknown, string> }) => {
        console.error(`${errorMessage}:`, event.error);
        // Future: Add error tracking service integration here
        // trackError(errorMessage, event.error);
      },
    ],
  };
}

// Worker compilation helper - prevents duplicate compilation calls
function compileWorkerIfNeeded(context: DepositMintContext) {
  if (context.mintWorker && context.workerCompilationStatus === "idle") {
    console.log("Starting worker compilation...");
    context.workerCompilationStatus = "compiling";

    context.mintWorker
      .compileIfNeeded()
      .then(() => {
        console.log("Worker compilation complete");
        context.workerCompilationStatus = "compiled";
      })
      .catch((err) => {
        console.error("Worker compilation failed:", err);
        context.workerCompilationStatus = "idle"; // Allow retry
      });
  } else if (context.workerCompilationStatus === "compiling") {
    console.log("Worker compilation already in progress...");
  } else if (context.workerCompilationStatus === "compiled") {
    console.log("Worker already compiled");
  }
}

// Machine types -----------------------------------------------------------------------

// Machine Context
export interface DepositMintContext {
  // Core deposit data
  activeDepositNumber: number | null;
  computedEthProof: EthProofResult | null;
  depositMintTx: string | null;
  testShowFactionClaim: boolean;

  // Bridge topics (observables)
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  depositProcessingStatus$: ReturnType<
    typeof getDepositProcessingStatus$
  > | null;

  compressedDepositProcessingStatus$: ReturnType<
    typeof getCompressedDepositProcessingStatus$
  > | null;

  // Observable statuses
  processingStatus: ObservableValue<
    ReturnType<typeof getCompressedDepositProcessingStatus$>
  > | null;

  // Triggers
  canComputeStatus: ObservableValue<
    ReturnType<typeof getCanComputeEthProof$>
  > | null;
  canMintStatus: ObservableValue<ReturnType<typeof getCanMint$>> | null;

  // Worker
  mintWorker: ZkappMintWorkerClient | null;
  workerCompilationStatus: "idle" | "compiling" | "compiled";

  // Status flags
  goToSetupStorage: boolean;
  needsToFundAccount: boolean;

  // user data
  setupStorageTransaction: string | null;

  // Error handling (consolidated)
  error: {
    message: string;
    reason: string;
    timestamp: number;
  } | null;
}

export type DepositMintEvents =
  | { type: "SET_DEPOSIT_NUMBER"; value: number }
  | { type: "CHECK_STATUS" }
  | { type: "COMPUTE_ETH_PROOF" }
  | { type: "BUILD_MINT_TX" }
  | { type: "SUBMIT_MINT_TX" }
  | { type: "RESET" }
  | { type: "ASSIGN_WORKER"; mintWorkerClient: ZkappMintWorkerClient };

export const getDepositMachine = (
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>,
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>,
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>,
) =>
  setup({
    types: {
      context: {} as DepositMintContext,
      events: {} as DepositMintEvents,
    },
    guards: {
      hasComputedEthProofGuard: ({ context }) =>
        context.computedEthProof !== null,
      hasDepositMintTxGuard: ({ context }) => context.depositMintTx !== null,
      hasActiveDepositNumberGuard: ({ context }) =>
        context.activeDepositNumber !== null,
      canComputeEthProof: ({ context }) =>
        context.canComputeStatus === "CanCompute",
      canMint: ({ context }) => context.canMintStatus === "ReadyToMint",
      // PLANNED FEATURE: Detect when user has missed minting opportunity
      // When enabled, this should check:
      // - context.canComputeStatus === "MissedMintingOpportunity" ||
      // - context.canMintStatus === "MissedMintingOpportunity" ||
      // - context.processingStatus?.deposit_processing_status === "MissedMintingOpportunity"
      isMissedOpportunity: ({}) => false,

      storageIsSetupAndFinalizedForCurrentMinaKeyGuard: ({ context }) =>
        storageIsSetupAndFinalizedForCurrentMinaKey(
          context.mintWorker!.minaWalletPubKeyBase58!,
        ), // This browser knows for this mina sender key that we have historically setup storage succesfully.
      setupStorageInProgressGuard: ({ context }) =>
        isSetupStorageInProgressForMinaKey(
          context.mintWorker!.minaWalletPubKeyBase58!,
        ), // This browser has sent a setupStorageTx
      setupStorageNotInProgressGuard: ({ context }) =>
        !isSetupStorageInProgressForMinaKey(
          context.mintWorker!.minaWalletPubKeyBase58!,
        ), // This browser has NOT sent a setupStorageTx
      shouldGotoSetupStorageGuard: ({ context }) =>
        context.goToSetupStorage === true, // An indicator used to after setupStorageOnChainCheck that we should go to setupStorage
      shouldShowFactionClaim: ({ context }) => context.testShowFactionClaim,
    },
    actors: {
      compressedDepositProcessingStatusActor,
      canComputeEthProofActor,
      canMintActor,
      storageIsSetupWithDelayActor,
      checkStorageSetupOnChain,
      setupStorage,
      submitSetupStorage,
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
      testShowFactionClaim: false,

      // RX topics
      ethStateTopic$,
      bridgeStateTopic$,
      bridgeTimingsTopic$,
      depositProcessingStatus$: null,
      compressedDepositProcessingStatus$: null,

      // Statuses
      processingStatus: null,

      // Trigger results
      canComputeStatus: null,
      canMintStatus: null,

      // Mint worker
      mintWorker: null,
      workerCompilationStatus: "idle" as const,

      // Flags
      goToSetupStorage: false,
      needsToFundAccount: false,

      // Data
      setupStorageTransaction: null,

      // Error context (consolidated)
      error: null,
    },
    states: {
      // Initial hydration state
      hydrating: {
        entry: log("Entering hydrating 💤"),
        always: [
          {
            target: "completed",
            guard: "shouldShowFactionClaim",
          },
          {
            target: "checking",
            guard: ({ context }) => context.mintWorker !== null,
          },
        ],
      },

      // Boot: hydrate state and determine next steps
      checking: {
        entry: [
          log("Entering checking 🚀"),
          assign(({ context }) => {
            // Batch localStorage reads for better performance
            const pairStore = Store.forPair(
              context.mintWorker!.ethWalletPubKeyBase58!,
              context.mintWorker!.minaWalletPubKeyBase58!,
            );
            const globalStore = Store.global();

            // Read all values at once
            const activeDepositNumber = pairStore.activeDepositNumber || null;
            const depositMintTx = pairStore.depositMintTx || null;
            const testShowFactionClaim = globalStore.showFactionClaim || false;

            // Safe JSON parse with error handling
            let computedEthProof: EthProofResult | null = null;
            try {
              const rawProof = pairStore.computedEthProof;
              if (rawProof) {
                computedEthProof = JSON.parse(rawProof) as EthProofResult;
              }
            } catch (err) {
              console.error(
                "Failed to parse computedEthProof from localStorage",
                err,
              );
              // Clear corrupted data
              pairStore.computedEthProof = null;
            }

            return {
              activeDepositNumber,
              computedEthProof,
              depositMintTx,
              testShowFactionClaim,
              error: null, // Clear any previous errors
            };
          }),
        ],
        always: [
          {
            target: "hasActiveDepositNumber",
            guard: "hasActiveDepositNumberGuard",
          },
          { target: "noActiveDepositNumber" },
        ],
      },

      // Add new intermediate state
      checkingDelay: {
        after: {
          8000: { target: "checking" }, // Wait 8 seconds, then go to checking
        },
      },

      // User needs to configure deposit number
      noActiveDepositNumber: {
        entry: [log("Entering noActiveDepositNumber 🚀")],
        on: {
          SET_DEPOSIT_NUMBER: {
            target: "hasActiveDepositNumber",
            actions: assign({
              activeDepositNumber: ({ event, context }) => {
                console.log("Setting activeDepositNumber:", event.value);
                Store.forPair(
                  context.mintWorker!.ethWalletPubKeyBase58!,
                  context.mintWorker!.minaWalletPubKeyBase58!,
                ).activeDepositNumber = event.value; //.toString();
                return event.value;
              },
            }),
          },
        },
      },

      hasActiveDepositNumber: {
        // invoke invokeMonitoringDepositStatus
        entry: [
          log("Entering hasActiveDepositNumber 🚀"),
          assign(({ context }) => {
            const depositProcessingStatus$ =
              getDepositProcessingStatus(context);

            return {
              processingStatus: null as null,
              canComputeStatus: null as null,
              canMintStatus: null as null,
              depositProcessingStatus$,
              compressedDepositProcessingStatus$:
                getCompressedDepositProcessingStatus$(depositProcessingStatus$),
              error: null, // Clear any previous errors
            };
          }),
        ],
        always: [
          // If we have an deposit mint tx computed
          { target: "submittingMintTx", guard: "hasDepositMintTxGuard" },
          // If we have an eth proof ready
          {
            target: "hasComputedEthProof",
            guard: "hasComputedEthProofGuard",
          },
          // If we have historically setupStorage for this mina key and we determined that tx was succesfull then goto monitoringDepositStatus straight away
          {
            target: "monitoringDepositStatus",
            guard: "storageIsSetupAndFinalizedForCurrentMinaKeyGuard",
          },
          // Check if we either need to check setup storage.
          {
            target:
              "needsToCheckSetupStorageOrWaitingForStorageSetupFinalization",
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // Check if we either need to do an on chain setupStorageOnChainCheck, or if we are waiting for setupStorage tx finalization because we have sent a setupStorage tx.
      needsToCheckSetupStorageOrWaitingForStorageSetupFinalization: {
        entry: log(
          "Entering needsToCheckSetupStorageOrWaitingForStorageSetupFinalization 🚀",
        ),
        invoke: invokeMonitoringDepositStatus,
        always: [
          {
            target: "setupStorageOnChainCheck",
            guard: "setupStorageNotInProgressGuard",
          }, // If we are not currently waiting for setupStorageTx finalization then goto setupStorageOnChainCheck
          {
            target: "waitForStorageSetupFinalization",
            guard: "setupStorageInProgressGuard",
          }, // If we have sent a setupStorageTx poll until it is finalized.
        ],
      }, // this still need missed mint oppertunity

      // Use the worker to see if we have actually setup storage based on the on chain state.
      setupStorageOnChainCheck: {
        entry: log("Entering setupStorageOnChainCheck 🚀"),
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "checkStorageSetupOnChain",
            input: ({ context }) => ({
              worker: context.mintWorker!,
            }),
            onDone: {
              actions: ({ event, context }) => {
                console.log("onDone setupStorageOnChainCheck.");
                const minaWalletPubKeyBase58 =
                  context.mintWorker?.minaWalletPubKeyBase58;
                if (!minaWalletPubKeyBase58)
                  throw new Error("MinaWalletPubKeyBase58 should exist by now");

                if (event.output === false) {
                  // Mark that we dont need to check setup storage again for this mina key
                  Store.forMina(minaWalletPubKeyBase58).needsToSetupStorage =
                    false;
                } else {
                  // Set needs to setup storage
                  context.goToSetupStorage = true;
                }
              },
            },
            onError: createErrorHandler(
              "Failed to check storage setup",
              "checking",
            ),
          },
        ],
        always: [
          // If we just determined that we dont need to setupStorage based off the onchain check then goto monitoringDepositStatus.
          {
            target: "monitoringDepositStatus",
            guard: "storageIsSetupAndFinalizedForCurrentMinaKeyGuard",
          },
          // If we determined that we do need to setupStorage go to that node.
          { target: "setupStorage", guard: "shouldGotoSetupStorageGuard" },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // Use the worker to setup storage
      setupStorage: {
        entry: log("Entering setupStorage 🚀"),
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "setupStorage",
            input: ({ context }) => ({
              worker: context.mintWorker!,
            }),
            onDone: {
              target: "submitSetupStorageTx", // Goto submitSetupStorageTx after we have built our setupStorageTx
              actions: ({ event, context }) => {
                console.log(`onDone storage setup`);
                if (event.output)
                  context.setupStorageTransaction = event.output;
                const minaWalletPubKeyBase58 =
                  context.mintWorker?.minaWalletPubKeyBase58;
                if (!minaWalletPubKeyBase58)
                  throw new Error("MinaWalletPubKeyBase58 should exist by now");

                // Disable goToSetupStorage flag
                context.goToSetupStorage = false;
              },
            },
            onError: createErrorHandler("Failed to setup storage"),
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // submitSetupStorageTx requires user interaction
      // FIXME note that this is not sufficient for the machine we should either on error go back to setupStorage or submitSetupStorageTx
      // We need to actually inspect the error to know what to do and perhaps have a decision node for this.
      submitSetupStorageTx: {
        entry: log("Entering submitSetupStorageTx 🚀"),
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "submitSetupStorage",
            input: ({ context }) => ({
              setupStorageTx: context.setupStorageTransaction!,
            }),
            onDone: {
              target: "waitForStorageSetupFinalization",
              actions: ({ context }) =>
                (Store.forMina(
                  context.mintWorker!.minaWalletPubKeyBase58,
                ).setupStorageInProgress = true),
            },
            onError: createErrorHandler(
              "Failed to submit storage, trying again",
              "setupStorage",
            ),
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // Keep polling needsToSetupStorage on chain in the worker until it return false indicating storage is setup
      waitForStorageSetupFinalization: {
        entry: log("Entering waitForStorageSetupFinalization 🚀"), // submit
        invoke: [
          invokeMonitoringDepositStatus,
          {
            id: "storageIsSetupWithDelay",
            src: "storageIsSetupWithDelayActor",
            input: ({ context }) => ({
              worker: context.mintWorker!,
            }),
            onSnapshot: {
              actions: ({ event, context }) => {
                if (event.snapshot.context === false) {
                  // Storage setup is done
                  const minaWalletPubKeyBase58 =
                    context.mintWorker?.minaWalletPubKeyBase58;
                  if (!minaWalletPubKeyBase58)
                    throw new Error(
                      "MinaWalletPubKeyBase58 should exist by now",
                    );
                  // Remove setupStorageInProgress flag
                  Store.forMina(minaWalletPubKeyBase58).setupStorageInProgress =
                    null;
                  // Mark needsToSetupStorage as false
                  Store.forMina(minaWalletPubKeyBase58).needsToSetupStorage =
                    false;
                }
              },
            },
            onError: createErrorHandler("Failed to wait for storage setup"),
          },
        ],
        always: [
          // this waits for needsToSetupStorage (for this particular mina key) to be set to false meaning we definitely have setupStorage
          {
            target: "monitoringDepositStatus",
            guard: "storageIsSetupAndFinalizedForCurrentMinaKeyGuard",
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // Now monitor deposit status and proceed to canComputeEthProof when ready or missedOpportunity is we have missed our window
      monitoringDepositStatus: {
        entry: ({ context }) => {
          console.log("Entered monitoringDepositStatus");
          compileWorkerIfNeeded(context); // Compile worker if needed (cached to prevent duplicates)
        },
        invoke: [
          invokeMonitoringDepositStatus,
          {
            id: "canComputeEthProof",
            src: "canComputeEthProofActor",
            input: ({ context }) => ({
              depositProcessingStatus$: context.depositProcessingStatus$!,
            }),
            onSnapshot: {
              actions: assign({
                canComputeStatus: ({ event }) => {
                  console.log("onSnapshotcanComputeEthProof", event);
                  return event.snapshot.context ?? null;
                },
              }),
            },
            onError: {
              actions: ({ event }) => {
                console.error("canComputeEthProofActor error:", event.error);
              },
            },
          },
          {
            id: "canMint",
            src: "canMintActor",
            input: ({ context }) => ({
              depositProcessingStatus$: context.depositProcessingStatus$!,
            }),
            onSnapshot: {
              actions: assign({
                canMintStatus: ({ event }) => {
                  console.log("onSnapshotcanMintActor", event);
                  return event.snapshot.context ?? null;
                },
              }),
            },
            onError: {
              actions: ({ event }) => {
                console.error("canMintActor error:", event.error);
              },
            },
          },
        ],
        always: [
          {
            target: "computeEthProof",
            guard: "canComputeEthProof",
          },
          {
            target: "missedOpportunity",
            guard: "isMissedOpportunity",
          },
        ],
      },

      computeEthProof: {
        entry: log("Entering computeEthProof 🚀"),
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "computeEthProof",
            input: ({ context }) => ({
              worker: context.mintWorker!,
              depositBlockNumber: context.activeDepositNumber!,
            }),
            onDone: {
              actions: assign({
                computedEthProof: ({ event, context }) => {
                  const proof = event.output;
                  Store.forPair(
                    context.mintWorker!.ethWalletPubKeyBase58!,
                    context.mintWorker!.minaWalletPubKeyBase58!,
                  ).computedEthProof = JSON.stringify(proof);
                  console.log("done comupting and saved to LS");
                  return proof;
                },
              }),
              target: "hasComputedEthProof",
            },
            onError: createErrorHandler("Failed to compute ETH proof"),
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      hasComputedEthProof: {
        entry: ({ context }) => {
          console.log("Entered hasComputedEthProof");
          compileWorkerIfNeeded(context); // Compile worker if needed (cached to prevent duplicates)
        },
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "canMintActor",
            input: ({ context }) => ({
              depositProcessingStatus$: context.depositProcessingStatus$!,
            }),
            onSnapshot: {
              actions: assign({
                canMintStatus: ({ event }) => {
                  console.log("Has computed eth proof event", event);
                  return event.snapshot.context ?? null;
                },
              }),
            },
            onError: {
              actions: ({ event }) => {
                console.error(
                  "canMintActor error in hasComputedEthProof:",
                  event.error,
                );
              },
            },
          },
        ],
        always: [
          { target: "buildingMintTx", guard: "canMint" },
          {
            target: "missedOpportunity",
            guard: "isMissedOpportunity",
          },
        ],
      },

      buildingMintTx: {
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "computeMintTx",
            input: ({ context }) => ({
              worker: context.mintWorker!,
            }),
            onDone: {
              actions: assign({
                depositMintTx: ({ event, context }) => {
                  const tx = event.output;
                  Store.forPair(
                    context.mintWorker!.ethWalletPubKeyBase58!,
                    context.mintWorker!.minaWalletPubKeyBase58!,
                  ).depositMintTx = tx;
                  return tx;
                },
              }),
              target: "submittingMintTx",
            },
            onError: createErrorHandler("Failed to build mint transaction"),
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      submittingMintTx: {
        invoke: [
          invokeMonitoringDepositStatus,
          {
            src: "submitMintTx",
            input: ({ context }) => ({
              mintTx: context.depositMintTx!,
            }),
            onDone: {
              target: "completed",
            },
            onError: createErrorHandler("Failed to submit mint transaction"),
          },
        ],
      },

      missedOpportunity: {
        entry: [
          log("Missed mint oppertunity"),
          ({ context }) =>
            resetLocalStorage(
              context.mintWorker!.ethWalletPubKeyBase58,
              context.mintWorker!.minaWalletPubKeyBase58,
            ),
        ],
      },

      completed: {
        // allow RESET event from this state
        // The global RESET handler (in 'on' block) will transition to hydrating
        entry: [
          log("✅ Deposit completed successfully - waiting for user to exit"),
          ({ context }) => {
            // Store completion timestamp for analytics
            console.log(
              "✅ Mint completed for deposit #",
              context.activeDepositNumber,
            );
            console.log(
              "User should click Exit button to reset and start new deposit",
            );

            // DO NOT auto-reset or clear localStorage here
            // Let user see the completion state and manually reset via Exit button
            // The RESET event handler (global 'on' block) will handle cleanup
          },
        ],
      },
    },

    // Global reset handler - works from any state
    // Dont see the point of these relative nodes... think they should actually be global so we can visit them from anywhere
    on: {
      ASSIGN_WORKER: {
        target: ".checking", // or ".checking" if you want to skip hydrating
        actions: [
          assign(({ event }) => ({
            // event is guaranteed to be ASSIGN_WORKER here
            mintWorker: event.mintWorkerClient,
            workerCompilationStatus: "idle" as const, // Reset compilation status for new worker
            activeDepositNumber: null,
            depositMintTx: null,
            computedEthProof: null,
            processingStatus: null,
            canComputeStatus: null,
            canMintStatus: null,
            needsToFundAccount: false,
            error: null, // Clear any errors
          })),
          ({ event }) => {
            console.log(
              "worker ETH address",
              event.mintWorkerClient.ethWalletPubKeyBase58,
            );
            console.log(
              "worker MINA address",
              event.mintWorkerClient.minaWalletPubKeyBase58,
            );
          },
        ],
      },

      RESET: {
        target: ".hydrating", // or ".hydrating"
        reenter: true, // v5 only; re-run entry even if already there
        actions: [
          assign({
            activeDepositNumber: null,
            depositMintTx: null,
            computedEthProof: null,
            processingStatus: null,
            canComputeStatus: null,
            canMintStatus: null,
            needsToFundAccount: false,
            error: null, // Clear any errors
          }),
          ({ context }) => {
            if (context.mintWorker) {
              resetLocalStorage(
                context.mintWorker.ethWalletPubKeyBase58,
                context.mintWorker.minaWalletPubKeyBase58,
              );
            } else {
              const lastEthWallet = Store.global().test_lastEthWallet;
              const lastMinaWallet = Store.global().test_lastMinaWallet;
              resetLocalStorage(lastEthWallet!, lastMinaWallet!);
            }
          },
        ],
      },
    },
  });
