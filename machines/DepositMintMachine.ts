"client"; // The server cannot use this machine! Should build a seperate machine for other purposes
import { assign, setup, log, raise } from "xstate";
// Import actual bridge deposit observables
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  getDepositProcessingStatus$,
  getCanMint$,
  getCanComputeEthProof$,
} from "@nori-zk/mina-token-bridge/rx/deposit";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import {
  isSetupStorageInProgressForMinaKey,
  LS_KEYS,
  makeMinaLSKey,
  resetLocalStorage,
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
} from "@/machines/actors/actions.ts";

// Commonly used invoke procedures

// This invoke entry will update the machine context when the deposit status changes can be used in any node.
const invokeMonitoringDepositStatus = {
  id: "depositProcessingStatus",
  src: "depositProcessingStatusActor" as const,
  input: ({ context }: { context: DepositMintContext }) =>
    ({
      depositBlockNumber: context.activeDepositNumber!,
      ethStateTopic$: context.ethStateTopic$!,
      bridgeStateTopic$: context.bridgeStateTopic$!,
      bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
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
        console.log(
          "onSnapshotdepositProcessingStatus",
          event.snapshot.context
        );
        return event.snapshot.context ?? null;
      },
    }),
  } as const,
};

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
        context.canMintStatus === "MissedMintingOpportunity",

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
            activeDepositNumber: () => {
              const v = localStorage.getItem(LS_KEYS.activeDepositNumber);
              if (!v) return null;
              return parseInt(v); // should check for NaN
            },
            computedEthProof: () => {
              const v = localStorage.getItem(LS_KEYS.computedEthProof);
              if (!v) return null;
              return JSON.parse(v) as EthProofResult; // should try catch and do something with this.
            },
            depositMintTx: () => localStorage.getItem(LS_KEYS.depositMintTx),
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
      noActiveDepositNumber: {
        entry: [log("Entering noActiveDepositNumber 🚀")],
        on: {
          SET_DEPOSIT_NUMBER: {
            target: "hasActiveDepositNumber",
            actions: assign({
              activeDepositNumber: ({ event }) => {
                console.log("Setting activeDepositNumber:", event.value);
                localStorage.setItem(
                  LS_KEYS.activeDepositNumber,
                  event.value.toString()
                );
                return event.value;
              },
            }),
          },
        },
      },

      hasActiveDepositNumber: {
        entry: [
          log("Entering hasActiveDepositNumber 🚀"),
          assign({
            // is this redundant?
            processingStatus: () => null as null,
            canComputeStatus: () => null as null,
            canMintStatus: () => null as null,
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
      },

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
      },

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
              target: "waitForStorageSetupFinalization",
              actions: ({ event, context }) => {
                console.log("onDone waitForStorageSetupFinalization.");
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
              actions: assign({
                errorMessage: "Failed to setup storage",
              }),
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
      },

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
              target: "waitForStorageSetupFinalization", // When we are sending the setupStorage tx goto waitForStorageSetupFinalization
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
              actions: assign({
                errorMessage: "Failed to setup storage",
              }),
            },
          },
        ],
      },

      // Keep polling needsToSetupStorage on chain in the worker until it return false indicating storage is setup
      waitForStorageSetupFinalization: {
        entry: log("Entering waitForStorageSetupFinalization 🚀"),
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
              actions: assign({
                errorMessage: "Failed to wait for storage setup",
              }),
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
      },

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
                computedEthProof: ({ event }) => {
                  const proof = event.output;
                  localStorage.setItem(
                    "computedEthProof",
                    JSON.stringify(proof)
                  );
                  console.log("done comupting and saved to LS");
                  return proof;
                },
              }),
              target: "hasComputedEthProof", //TODO go to monitoringDepositStatus
            },
            onError: {
              target: "error",
              actions: assign({
                errorMessage: ({ event }) => {
                  console.error("Failed to compute ETH proof:", event.error);
                  if (event.error instanceof Error) {
                    console.error("Stack trace:", event.error.stack);
                  }
                  return "Failed to compute ETH proof";
                },
              }),
            },
          },
        ],
      },

      hasComputedEthProof: {
        entry: ({ context }) => {
          console.log("Entered hasComputedEthProof");
          context.mintWorker?.compileIfNeeded();
        },
        invoke: [
          invokeMonitoringDepositStatus,
          {
            // This is fine but we are not monitoring the deposit status anymore, need to add that actor back in to make
            // sure we update the machine context during this stage.... consider adding depositProcessingStatusActor back here
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
                  console.log("Has computed eth proof event", event);
                  return event.snapshot.context ?? null;
                },
              }),
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
                depositMintTx: ({ event }) => {
                  const tx = event.output;
                  window.localStorage.setItem("depositMintTx", tx);
                  return tx;
                },
              }),
              target: "submittingMintTx",
            },
            onError: {
              target: "error",
              actions: assign({
                errorMessage: ({ event }) => {
                  console.error("Mint transaction error:", event.error);
                  if (event.error instanceof Error) {
                    console.error("Stack trace:", event.error.stack);
                  }
                  return "Failed to build mint transaction";
                },
              }),
            },
          },
        ],
      },

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
              actions: assign({
                errorMessage: "Failed to submit mint transaction",
              }),
            },
          },
        ],
      },

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
            // minaSenderAddress: null,
            // ethSenderAddress: null,
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
