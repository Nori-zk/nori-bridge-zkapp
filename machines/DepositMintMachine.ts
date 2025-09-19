"client";
import {
  assign,
  // assign,
  fromObservable,
  fromPromise,
  setup,
  log,
  raise,
  SnapshotEvent,
  ObservableSnapshot,
  ProvidedActor,
  EventFrom,
  // type StateMachine,
  // type AnyStateMachine,
} from "xstate";
import {
  catchError,
  filter,
  first,
  from,
  interval,
  Observable,
  of,
  startWith,
  switchMap,
} from "rxjs";
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
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";

// Generic types
type ObservableValue<T> = T extends Observable<infer U> ? U : never;

// Mint types ------------------------------------------------------------------------

// Eth proof type
type EthProofResult = {
  ethVerifierProofJson: JsonProof;
  depositAttestationInput: {
    path: string[];
    depositIndex: number;
    rootHash: string;
    despositSlotRaw: {
      slot_key_address: string;
      slot_nested_key_attestation_hash: string;
      value: string;
    };
  };
};

// Deposit processing actor types
type DepositProcessingValue = ObservableValue<
  ReturnType<typeof getDepositProcessingStatus$>
>;
type DepositProcessingInput = {
  depositBlockNumber: number;
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
};
type DepositProcessingSnapshot = ObservableSnapshot<
  DepositProcessingValue,
  DepositProcessingInput
>;
type DepositSnapshotEvent = SnapshotEvent<DepositProcessingSnapshot>;

// localStorage utils --------------------------------------------------------------------------------------

// Storage helpers (safe SSR), this is silly, the server could never pre-render this in a meaningful way.
// This file is now marked as client-only, so the `typeof window !== "undefined"`
// checks are unnecessary. You can safely access localStorage directly.
/*const localStorage = {
  get: (k: string): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(k),
  set: (k: string, v: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
  del: (k: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  },
};*/

// Local storage fixed keys
export const LS_KEYS = {
  activeDepositNumber: "activeDepositNumber",
  computedEthProof: "computedEthProof",
  depositMintTx: "depositMintTx",
  // isStorageSetup: "isStorageSetup",
} as const;

// Lets define the dynamic keys more rigorously have it as '<concept>:' and then the key information

const LSKeyPairConceptKeys = ["codeVerifier"] as const;
type LSKeyPairConceptKeys = (typeof LSKeyPairConceptKeys)[number];

function makeKeyPairLSKey(
  concept: LSKeyPairConceptKeys,
  ethWalletPubKeyBase58: string,
  minaWalletPubKeyBase58: string
) {
  return `${concept}:${ethWalletPubKeyBase58}-${minaWalletPubKeyBase58}`;
}

const LSMinaConceptKeys = ["needsToSetupStorage"] as const;
type LSMinaConceptKeys = (typeof LSMinaConceptKeys)[number];

function makeMinaLSKey(
  concept: LSMinaConceptKeys,
  minaWalletPubKeyBase58: string
) {
  return `${concept}:${minaWalletPubKeyBase58}`;
}

// Util to reset the storage but keep the codeVerifier and needsToSetupStorage dynamic keys
const resetLocalStorage = () => {
  console.log("Resetting machine and clearing localStorage on complete");
  // Exact keys we always want to keep
  const keepKeys: string[] = [];

  // Key-matching functions we always want to keep
  const keepFilters = [
    // Key-pair LS keys
    (key: string) =>
      LSKeyPairConceptKeys.some((concept) => key.startsWith(`${concept}:`)),

    // Mina LS keys
    (key: string) =>
      LSMinaConceptKeys.some((concept) => key.startsWith(`${concept}:`)),
  ];

  Object.keys(localStorage).forEach((key) => {
    const inKeepKeys = keepKeys.includes(key);
    const matchesFilter = keepFilters.some((fn) => fn(key));

    if (!inKeepKeys && !matchesFilter) {
      localStorage.removeItem(key);
    }
  });
};

// Actors --------------------------------------------------------------------------------

// Observable actors ---------------------

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

const storageIsSetupWithDelayActor = fromObservable(
  ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    const period = 1000;
    return interval(period).pipe(
      startWith(0), // check immediately
      switchMap(() => from(input.worker.needsToSetupStorage())),
      catchError(() => of(true)), // on error treat as "still needs setup" and keep polling
      filter((needsSetup) => !needsSetup),
      first() // emits `false` then completes
    );
  }
);

// Promise actors -----------------------------

const checkStorageSetup = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    try {
      console.log(
        "Checking storage setup for address eth:",
        input.worker.ethWalletPubKeyBase58
      );
      console.log(
        "Checking storage setup for address mina:",
        input.worker.minaWalletPubKeyBase58
      );
      //TODO store and then fetch if needSetup from localStorage
      return input.worker.needsToSetupStorage();
    } catch (err) {
      console.log("Error in checkStorageSetup: ", err);
    }
  }
);

const setupStorage = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    const txStr = await input.worker.setupStorage();
    console.log("Storage setup transactionready");
    return txStr;
  }
);

const computeEthProof = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
      depositBlockNumber: number;
    };
  }) => {
    const codeVerify = localStorage.getItem(
      makeKeyPairLSKey(
        "codeVerifier",
        input.worker.ethWalletPubKeyBase58,
        input.worker.minaWalletPubKeyBase58
      )
    );
    const codeChallange = await input.worker?.createCodeChallenge(codeVerify!);
    console.log("about to computeEthProof with codeChallange");
    const ethProof =
      await input.worker.computeDepositAttestationWitnessAndEthVerifier(
        codeChallange!,
        input.depositBlockNumber
      );

    // Store in localStorage
    localStorage.setItem(LS_KEYS.computedEthProof, JSON.stringify(ethProof));
    // localStorage.setItem(LS_KEYS.lastEthProofCompute, Date.now().toString());
    console.log(
      "Computed ethProof value :",
      ethProof.depositAttestationInput.despositSlotRaw.value
    );
    return ethProof;
  }
);

const computeMintTx = fromPromise(
  async ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
      // ethProof: JsonProof; // from localStorage
      // needsToFundAccount: boolean;
    };
  }) => {
    const state = localStorage.getItem(LS_KEYS.computedEthProof);
    const codeVerify = localStorage.getItem(
      `codeVerify${input.worker.ethWalletPubKeyBase58}-${input.worker.minaWalletPubKeyBase58}`
    );
    console.log("codeVerifier", codeVerify);
    const needsToFundAccount = await input.worker.needsToFundAccount();
    console.log("needsToFundAccount", needsToFundAccount);
    if (!state || !codeVerify)
      throw new Error("No stored eth proof or codeVerify found");
    const storedProof = JSON.parse(state) as EthProofResult;
    const mintTxStr = await input.worker.computeMintTx(
      storedProof.ethVerifierProofJson,
      storedProof.depositAttestationInput,
      codeVerify,
      needsToFundAccount
    );

    // Store in localStorage
    localStorage.setItem(LS_KEYS.depositMintTx, mintTxStr);
    return mintTxStr; //JSON of tx that we need to send to wallet - to componet/provider
  }
);

const submitMintTx = fromPromise(
  async ({ input }: { input: { mintTx: string } }) => {
    // In a real implementation, this would submit the transaction to the Mina network
    console.log("Submitting mint transaction:", input.mintTx);

    const fee = (0.1 * 1e9).toString(); // 0.1 MINA in nanomina
    const memo = "Submit mint tx";
    const onlySign = false;
    const result = await window.mina?.sendTransaction({
      // FIXME this is not done in an idiomatic react way, and the type is incomplete.
      onlySign: onlySign,
      transaction: input.mintTx,
      feePayer: {
        fee: fee,
        memo: memo,
      },
    });

    console.log("submit mint tx result", result);
    return true;
  }
);

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
  mintWorker: ZkappMintWorkerClient | null;
  setupStorageTransaction: string | null;
  // Status flags
  needsToSetupStorage: false | null;

  isWorkerReady: boolean;
  isStorageSetup: boolean;
  // isWorkerCompiled: boolean;
  needsToFundAccount: boolean;
  waitingForStorageSetupTx: boolean;

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
      //hasWorker: ({ context }) => context.isWorkerReady === true,
      canComputeEthProof: ({ context }) =>
        context.canComputeStatus === "CanCompute",
      canMint: ({ context }) => context.canMintStatus === "ReadyToMint",
      isMissedOpportunity: ({ context }) =>
        context.canComputeStatus === "MissedMintingOpportunity" ||
        context.canMintStatus === "MissedMintingOpportunity",

      needsStorageSetup: ({ context }) => !context.isStorageSetup,
      storageIsSetupGuard: ({ context }) => context.isStorageSetup,
      storageIsPending: ({ context }) => !context.waitingForStorageSetupTx,
      //checkingStorageSetupGuard: ({ context }) => context.mintWorker !== null,

      // isWorkerCompiled: ({ context }) => context.isWorkerCompiled,
    },
    actors: {
      depositProcessingStatusActor,
      canComputeEthProofActor,
      canMintActor,
      storageIsSetupWithDelayActor,
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

      isWorkerReady: false,
      isStorageSetup: false,
      needsToSetupStorage: null,


      // isWorkerCompiled: false,
      needsToFundAccount: false,
      errorMessage: null,
      setupStorageTransaction: null,
      waitingForStorageSetupTx: true,
    },
    states: {
      // Initial hydration state - same on server and client
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
          {
            target: "monitoringDepositStatus",
            guard: "storageIsSetupGuard",
          },
          {
            target: "checkingStorageSetup",
          },
        ],
      },




      /*

      check local storage for state

      WE_SHOULD_SETUP_BUT_WEVE_NOT_EVEN_TRIED, WE_ARE_TRYING, STORAGE_IS_SETUP
      
      LS state:
      STORAGE_IS_SETUP // STORAGE_IS_NOT_SETUP

      in the case that STORAGE_IS_NOT_SETUP
      WEVE_NOT_EVEN_TRIED (need to submit) // WE_HAVE_SUBMITTED (storage tx in progress)

      pending tx -> poll

      */

      // what nodes do we really want

      // check if needsToSetupStorage based on the mina key is false so we can skip it

      // Step 1: Check if storage setup is needed
      checkingStorageSetup: {
        entry: log("Entering checkingStorageSetup 🚀"),
        invoke: {
          src: "checkStorageSetup",
          input: ({ context }) => ({
            worker: context.mintWorker!,
          }),
          onDone: {
            actions: assign({
              isStorageSetup: ({ event }) => {
                const needsToSetupStore = event.output;
                return !needsToSetupStore; // we have a setup storage
              },
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
            target: "waitingForStorageSetupTx",
            guard: "storageIsPending",
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
        entry: log("Entering settingUpStorage 🚀"),
        invoke: {
          src: "setupStorage",
          input: ({ context }) => ({
            worker: context.mintWorker!,
          }),
          onDone: {
            target: "checkingStorageSetup",
            actions: [
              log("onDone storage setup"),
              assign({
                // isStorageSetup: true,
                waitingForStorageSetupTx: true,
                setupStorageTransaction: ({ event }) => event.output, // event.data is txStr
              }),
            ],
          },
          onError: {
            target: "error",
            actions: assign({
              errorMessage: "Failed to setup storage",
            }),
          },
        },
      },
      waitingForStorageSetupTx: {
        entry: log("Entering waitingForStorageSetupTx 🚀"),
        invoke: {
          id: "storageIsSetupWithDelay",
          src: "storageIsSetupWithDelayActor",
          input: ({ context }) => ({
            worker: context.mintWorker!,
          }),
          onSnapshot: {
            actions: assign({
              waitingForStorageSetupTx: ({ event }) => {
                console.log(
                  "onSnapshotstrorageIsSetupWithDelay",
                  // event.snapshot.
                  // context.
                  event.snapshot.context
                );
                return event.snapshot.context!;
                // return event.snapshot.context ?? null;
              },
            }),
          },
          // onDone: {
          //   target: "checkingStorageSetup",
          //   actions: [
          //     log("onDone storage setup"),
          //     assign({
          //       // isStorageSetup: true,
          //       waitingForStorageSetupTx: true,
          //       setupStorageTransaction: ({ event }) => event.output, // event.data is txStr
          //     })],
          // },
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
        entry: log("Entering computingEthProof 🚀"),
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
                errorMessage: "Failed to compute ETH proof",
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
              // window.localStorage.removeItem("activeDepositNumber");
              // window.localStorage.removeItem("depositMintTx");
              // window.localStorage.removeItem("computedEthProof");
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
        // type: "final",
        entry: [
          log("Deposit completed successfully"),
          () => resetLocalStorage(),
          raise({ type: "RESET" }), // sends to top-level machine
        ],
      },

      completed: {
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
          isWorkerReady: true,
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
            isWorkerReady: mintWorker !== null,
            // minaSenderAddress: null,
            // ethSenderAddress: null,
            isStorageSetup: false,
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
