"use client"; // The server cannot use this machine! Should build a seperate machine for other purposes
import { assign, setup, log, raise } from "xstate";
// Import actual bridge deposit observables
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  //getDepositProcessingStatus$,
  getCanMint$,
  getCanComputeEthProof$,
} from "@nori-zk/mina-token-bridge/rx/deposit";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import {
  getActiveDepositNumber,
  getComputedEthProof,
  getDepositMintTx,
  isSetupStorageInProgressForMinaKey,
  makeMinaLSKey,
  resetLocalStorage,
  setActiveDepositNumber,
  setComputedEthProof,
  setDepositMintTx,
  storageIsSetupAndFinalizedForCurrentMinaKey,
} from "@/helpers/localStorage.ts";
import { DepositSnapshotEvent } from "@/machines/actors/statuses.ts";
import { EthProofResult, ObservableValue } from "./types.ts";
import { depositProcessingStatusActor } from "@/machines/actors/statuses.ts";
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
import _ from "@/node_modules/xstate/dist/declarations/src/guards.js"; // this is just to supress the xstate guards ref needed.
import { getDepositProcessingStatus$ } from "./obs/getDepositProcessingStatus$.ts";
// Commonly used invoke procedures

// This invoke entry will update the machine context when the deposit status changes can be used in any node.
const invokeMonitoringDepositStatus = {
  id: "depositProcessingStatus",
  src: "depositProcessingStatusActor" as const,
  input: ({ context }: { context: DepositMintContext }) =>
  ({
    depositProcessingStatus$: context.depositProcessingStatus$!,
  } as const),
  onSnapshot: {
    actions: assign<
      DepositMintContext,
      DepositSnapshotEvent,
      undefined,
      DepositMintEvents,
      never
    >({
      processingStatus: ({ event }) => {
        // console.log(
        //   "onSnapshotdepositProcessingStatus",
        //   event.snapshot.context
        // );
        return event.snapshot.context ?? null;
      },
    }),
  } as const,
  onError: {
    actions: ({ event }) => {
      console.error("depositProcessingStatusActor error:", event.error);
    },
  },
};

// Get deposit processing status

function getDepositProcessingStatus(context: DepositMintContext) {
  return getDepositProcessingStatus$(
    context.activeDepositNumber!,
    context.ethStateTopic$,
    context.bridgeStateTopic$,
    context.bridgeTimingsTopic$
  );
}

// Machine types -----------------------------------------------------------------------

// Machine Context
export interface DepositMintContext {
  // Core deposit data
  activeDepositNumber: number | null;
  computedEthProof: EthProofResult | null;
  depositMintTx: string | null;

  // Bridge topics (observables)
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  depositProcessingStatus$: ReturnType<
    typeof getDepositProcessingStatus$
  > | null;

  // Observable statuses
  processingStatus: ObservableValue<
    ReturnType<typeof getDepositProcessingStatus$>
  > | null;

  // Triggers
  canComputeStatus: ObservableValue<
    ReturnType<typeof getCanComputeEthProof$>
  > | null;
  canMintStatus: ObservableValue<ReturnType<typeof getCanMint$>> | null;

  // Worker
  mintWorker: ZkappMintWorkerClient | null;

  // Status flags
  goToSetupStorage: boolean;
  needsToFundAccount: boolean;

  // user data
  setupStorageTransaction: string | null;

  // Error handling
  errorMessage: string | null;
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
  topics: {
    ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
    bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
    bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  },
  mintWorker: ZkappMintWorkerClient | null
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
      isMissedOpportunity: ({ context }) =>
        context.canComputeStatus === "MissedMintingOpportunity" ||
        context.canMintStatus === "MissedMintingOpportunity" ||
        context.processingStatus?.deposit_processing_status ==
        "MissedMintingOpportunity",

      storageIsSetupAndFinalizedForCurrentMinaKeyGuard: ({ context }) =>
        storageIsSetupAndFinalizedForCurrentMinaKey(
          context.mintWorker?.minaWalletPubKeyBase58
        ), // This browser knows for this mina sender key that we have historically setup storage succesfully.
      setupStorageInProgressGuard: ({ context }) =>
        isSetupStorageInProgressForMinaKey(
          context.mintWorker?.minaWalletPubKeyBase58
        ), // This browser has sent a setupStorageTx
      setupStorageNotInProgressGuard: ({ context }) =>
        !isSetupStorageInProgressForMinaKey(
          context.mintWorker?.minaWalletPubKeyBase58
        ), // This browser has NOT sent a setupStorageTx
      shouldGotoSetupStorageGuard: ({ context }) =>
        context.goToSetupStorage === true, // An indicator used to after setupStorageOnChainCheck that we should go to setupStorage
    },
    actors: {
      depositProcessingStatusActor,
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

      // RX topics
      ethStateTopic$: topics.ethStateTopic$,
      bridgeStateTopic$: topics.bridgeStateTopic$,
      bridgeTimingsTopic$: topics.bridgeTimingsTopic$,
      depositProcessingStatus$: null,

      // Statuses
      processingStatus: null,

      // Trigger results
      canComputeStatus: null,
      canMintStatus: null,

      // Mint worker
      mintWorker: mintWorker || null, // Use passed worker or null

      // Flags
      goToSetupStorage: false,
      needsToFundAccount: false,

      // Data
      setupStorageTransaction: null,

      // Error context
      errorMessage: null,
    },
    states: {
      // Initial hydration state
      hydrating: {
        entry: log("Entering hydrating 💤"),
        always: {
          target: "checking",
          guard: ({ context }) => context.mintWorker !== null,
        },
      },

      // Boot: hydrate state and determine next steps
      checking: {
        entry: [
          log("Entering checking 🚀"),
          assign({
            activeDepositNumber: ({ context }) => {
              const v = getActiveDepositNumber(
                context.mintWorker!.ethWalletPubKeyBase58!,
                context.mintWorker!.minaWalletPubKeyBase58!
              );
              if (!v) return null;
              return parseInt(v); // should check for NaN
            },
            computedEthProof: ({ context }) => {
              const v = getComputedEthProof(
                context.mintWorker!.ethWalletPubKeyBase58!,
                context.mintWorker!.minaWalletPubKeyBase58!
              );
              if (!v) return null;
              return JSON.parse(v) as EthProofResult; // should try catch and do something with this.
            },
            depositMintTx: ({ context }) => getDepositMintTx(
              context.mintWorker!.ethWalletPubKeyBase58!,
              context.mintWorker!.minaWalletPubKeyBase58!
            ),
            errorMessage: null,
          }),
        ],
        always: [
          {
            target: "hasComputedEthProof",
            guard: "hasComputedEthProofGuard",
          },
          { target: "hasDepositMintTx", guard: "hasDepositMintTxGuard" },
          {
            target: "hasActiveDepositNumber",
            guard: "hasActiveDepositNumberGuard",
          },
          { target: "noActiveDepositNumber" },
        ],
      },

      // User needs to configure deposit number
      //should always be triggered if user actually locks tokens?
      noActiveDepositNumber: {
        entry: [log("Entering noActiveDepositNumber 🚀")],
        on: {
          SET_DEPOSIT_NUMBER: {
            target: "hasActiveDepositNumber",
            actions: assign({
              activeDepositNumber: ({ event, context }) => {
                console.log("Setting activeDepositNumber:", event.value);
                setActiveDepositNumber(
                  context.mintWorker!.ethWalletPubKeyBase58!,
                  context.mintWorker!.minaWalletPubKeyBase58!,
                  event.value.toString()
                )
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
          assign({
            // is this redundant?
            processingStatus: () => null as null,
            canComputeStatus: () => null as null,
            canMintStatus: () => null as null,
            depositProcessingStatus$: ({ context }) =>
              getDepositProcessingStatus(context),
            errorMessage: null,
          }),
        ],
        always: [
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
          "Entering needsToCheckSetupStorageOrWaitingForStorageSetupFinalization 🚀"
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
              //target: "waitForStorageSetupFinalization",
              actions: ({ event, context }) => {
                console.log("onDone setupStorageOnChainCheck.");
                const minaWalletPubKeyBase58 =
                  context.mintWorker?.minaWalletPubKeyBase58;
                if (!minaWalletPubKeyBase58)
                  throw new Error("MinaWalletPubKeyBase58 should exist by now");
                // Mark setupStorageInProgress to true.
                if (event.output === false) {
                  // mark that we dont need to check setup storage again for this mina key for this browser
                  localStorage.setItem(
                    makeMinaLSKey(
                      "needsToSetupStorage",
                      minaWalletPubKeyBase58
                    ),
                    "false"
                  );
                } else {
                  // set needs to setup storage
                  context.goToSetupStorage = true;
                }
              },
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to setup storage",
                }),
                ({ event }) => {
                  console.error("checkStorageSetupOnChain error:", event.error);
                },
              ],
            },
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
                console.log(`onDone storage setup. Tx hash '${event.output}'`);
                if (event.output)
                  context.setupStorageTransaction = event.output;
                const minaWalletPubKeyBase58 =
                  context.mintWorker?.minaWalletPubKeyBase58;
                if (!minaWalletPubKeyBase58)
                  throw new Error("MinaWalletPubKeyBase58 should exist by now");
                // Mark setupStorageInProgress to true.
                localStorage.setItem(
                  makeMinaLSKey(
                    "setupStorageInProgress",
                    minaWalletPubKeyBase58
                  ),
                  "true"
                );
                // Disable goToSetupStorage flag
                context.goToSetupStorage = false;
              },
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to setup storage",
                }),
                ({ event }) => {
                  console.error("setupStorage error:", event.error);
                },
              ],
            },
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
            },
            onError: {
              target: "setupStorage",
              actions: assign({
                errorMessage: "Failed to submit storage",
              }),
            },
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
                  // here we no longer need to setup storage because it is done
                  const minaWalletPubKeyBase58 =
                    context.mintWorker?.minaWalletPubKeyBase58;
                  if (!minaWalletPubKeyBase58)
                    throw new Error(
                      "MinaWalletPubKeyBase58 should exist by now"
                    );
                  // Remove setupStorageInProgress because it is done
                  localStorage.removeItem(
                    makeMinaLSKey(
                      "setupStorageInProgress",
                      minaWalletPubKeyBase58
                    )
                  );
                  // Mark needsToSetupStorage as false for this mina public key because we do not need to setup storage again
                  localStorage.setItem(
                    makeMinaLSKey(
                      "needsToSetupStorage",
                      minaWalletPubKeyBase58
                    ),
                    "false"
                  );
                }
              },
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to wait for storage setup",
                }),
                ({ event }) => {
                  console.error("storageIsSetupWithDelayActor error:", event.error);
                },
              ],
            },
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
          context.mintWorker?.compileIfNeeded(); // Try and spin up the worker helps clients which have setup storage f5'd and entered monitoringDepositStatus
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
                  setComputedEthProof(
                    context.mintWorker!.ethWalletPubKeyBase58!,
                    context.mintWorker!.minaWalletPubKeyBase58!,
                    JSON.stringify(proof)
                  )
                  console.log("done comupting and saved to LS");
                  return proof;
                },
              }),
              target: "hasComputedEthProof",
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to compute ETH proof",
                }),
                ({ event }) => {
                  console.error("computeEthProof error:", event.error);
                  if (event.error instanceof Error) {
                    console.error("Stack trace:", event.error.stack);
                  }
                },
              ],
            },
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      hasComputedEthProof: {
        entry: ({ context }) => {
          console.log("Entered hasComputedEthProof");
          context.mintWorker?.compileIfNeeded();
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
                console.error("canMintActor error in hasComputedEthProof:", event.error);
              }
              //DepositMintMachine.ts:694 computeMintTx error: Error: No stored eth proof or codeVerify found

              // DepositMintMachine.ts:696 Stack trace: Error: No stored eth proof or codeVerify found
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
            // Again here consider having the depositProcessingStatusActor here so we can still update the relevant
            // bridge context when in this node...
            src: "computeMintTx",
            input: ({ context }) => ({
              worker: context.mintWorker!,
              // minaSenderAddress: context.minaSenderAddress!,
              //ethProof: context.computedEthProof!,
              //needsToFundAccount: context.needsToFundAccount,
            }),
            onDone: {
              actions: assign({
                depositMintTx: ({ event, context }) => {
                  const tx = event.output;
                  setDepositMintTx(
                    context.mintWorker!.ethWalletPubKeyBase58!,
                    context.mintWorker!.minaWalletPubKeyBase58!,
                    tx
                  )
                  return tx;
                },
              }),
              target: "submittingMintTx",
            },
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to build mint transaction",
                }),
                ({ event }) => {
                  console.error("computeMintTx error:", event.error);
                  if (event.error instanceof Error) {
                    console.error("Stack trace:", event.error.stack);
                  }
                },
              ],
            },
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      hasDepositMintTx: {
        on: {
          SUBMIT_MINT_TX: {
            target: "submittingMintTx",
          },
        },
      },

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
            onError: {
              target: "error",
              actions: [
                assign({
                  errorMessage: "Failed to submit mint transaction",
                }),
                ({ event }) => {
                  console.error("submitMintTx error:", event.error);
                  // if {
                  // "code": 1002,
                  // "message": "User rejected the request."
                  // }
                },
              ],
            },
          },
        ],
      }, // this still need missed mint oppertunity in always, invokeMonitoringDepositStatus ensures we can use the isMissedOpportunity guard

      // Error state for handling failures
      error: {
        on: {
          RESET: {
            target: "checking",
          },
        },
      },

      missedOpportunity: {
        // type: "final",
        // should probably toast
        entry: [
          log("Missed mint oppertunity"),
          () => resetLocalStorage(),
          //raise({ type: "RESET" }), // sends to top-level machine,
        ],
      },

      completed: {
        // should probably toast
        entry: [
          log("Deposit completed successfully"),
          () => {
            // Clear localStorage on reset
            resetLocalStorage();
          },
          raise({ type: "RESET" }), // <- sends RESET to this machine (NOTE: actually it send it to the top machine which if we have a parent might not be this machine)
          // TODO: think we need to double check the relative node path stuff for the whole machine
        ],
      },
    },

    // Global reset handler - works from any state
    // Dont see the point of these relative nodes... think they should actually be global so we can visit them from anywhere
    on: {
      ASSIGN_WORKER: {
        target: ".checking", // or ".checking" if you want to skip hydrating
        actions: assign(({ event }) => ({
          // event is guaranteed to be ASSIGN_WORKER here
          mintWorker: event.mintWorkerClient,
          activeDepositNumber: null,
          depositMintTx: null,
          computedEthProof: null,
          processingStatus: null,
          canComputeStatus: null,
          canMintStatus: null,
          needsToFundAccount: false,
          errorMessage: null,
        })),
      },
      RESET: {
        target: ".checking", // or ".hydrating"
        reenter: true, // v5 only; re-run entry even if already there
        actions: [
          assign({
            activeDepositNumber: null,
            depositMintTx: null,
            computedEthProof: null,
            processingStatus: null,
            canComputeStatus: null,
            canMintStatus: null,
            mintWorker: mintWorker || null,
            needsToFundAccount: false,
            errorMessage: null,
          }),
          () => {
            // Clear localStorage on reset
            resetLocalStorage();
          },
        ],
      },
    },
  });