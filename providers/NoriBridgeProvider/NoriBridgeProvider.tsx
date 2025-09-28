import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMachine } from "@xstate/react";
import { StateFrom, StateValueFrom } from "xstate";
import {
  getDepositMachine,
  type DepositMintContext,
  type DepositMintEvents,
} from "@/machines/DepositMintMachine.ts";
import { useSetup } from "../SetupProvider/SetupProvider.tsx";
import { useMetaMaskWallet } from "../MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { getBridgeMachine } from "@/machines/BridgeMachine.ts";
import envConfig from "@/helpers/env.ts";
import { BridgeDepositProcessingStatus } from "@nori-zk/mina-token-bridge/rx/deposit";
import { DepositStates } from "@/types/types.ts";
import { ReplacementDepositProcessingStatus, ReplacementStageName, ReplacementStageNameValues, ReplacementDepositProcessingStatusValues } from "@/machines/actors/statuses.ts";
import getWorkerClient from "@/singletons/workerSingleton.ts";

// Extract the machine type
type DepositMachine = ReturnType<typeof getDepositMachine>;

// Extract state value types from the machine
type DepositStateValue = StateValueFrom<DepositMachine>;

// Extract full state type
type DepositState = StateFrom<DepositMachine>;

// Type-safe state checkers
type StateCheckers = {
  [K in DepositStates]: boolean;
};

type NoriBridgeContextType = {
  // Machine state and actions with proper typing
  state: {
    value: DepositStateValue;
    context: DepositMintContext;
    fullState: DepositState; // Full XState state object
  };
  send: (event: DepositMintEvents) => void;

  // Type-safe state checkers (replaces matches)
  is: StateCheckers;

  // Current state as typed string
  currentState: DepositStates;

  // Convenience flags
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
  canSetupStorage: boolean;

  // Current bridge stage data
  bridgeStage: string;
  bridgeStateElapsedSec: number;
  bridgeStateTimeRemaining: number;

  // Current deposit status
  depositNumber: number;
  hasActiveDeposit: boolean;
  depositStatus: string;
  depositStatusStepIndex: number;
  depositBridgeStageName: string;
  depositBridgeStageIndex: number;
  depositStepElapsedTime: number;
  depositStepTimeRemaining: number;

  // Helper methods
  setDepositNumber: (depositNumber: number) => void;
  setPresentation: (presentationJsonStr: string) => void;
  retry: () => void;
  reset: () => void;
};

const minaConfig = {
  networkId: envConfig.MINA_RPC_NETWORK_ID,
  mina: envConfig.MINA_RPC_NETWORK_URL,
};

const NoriBridgeContext = createContext<NoriBridgeContextType | null>(null);

export const NoriBridgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mintWorker, setMintWorker] = useState<ZkappMintWorkerClient | null>(
    null
  );

  const { ethStateTopic$, bridgeStateTopic$, bridgeTimingsTopic$ } = useSetup();
  const { walletAddress: ethAddress } = useMetaMaskWallet();
  const { address: minaAddress } = useAccount();

  // Setup the bridgeMachine
  const bridgeMachine = useMemo(
    () => getBridgeMachine(bridgeStateTopic$, bridgeTimingsTopic$),
    [bridgeStateTopic$, bridgeTimingsTopic$]
  );

  // Use the bridge machine
  const [bridgeState, _] = useMachine(bridgeMachine);

  // Setup the depositMintMachine
  const depositMintMachine = useMemo(
    () =>
      getDepositMachine(
        ethStateTopic$,
        bridgeStateTopic$,
        bridgeTimingsTopic$,
      ),
    [ethStateTopic$, bridgeStateTopic$, bridgeTimingsTopic$]
  );

  // Use the deposit machine
  const [depositState, sendDepositMachine] = useMachine(depositMintMachine);

  useEffect(() => {
    if (minaAddress && ethAddress) {
      if (!mintWorker) {
        const worker = getWorkerClient()
        worker.setWallets({
          minaPubKeyBase58: minaAddress,
          ethPubKeyBase58: ethAddress,
        });
        worker.minaSetup(minaConfig);
        console.log("creating worker: ", worker);
        setMintWorker(worker);
        sendDepositMachine({ type: "ASSIGN_WORKER", mintWorkerClient: worker });
      } else {
        //update existing worker
        mintWorker.setWallets({
          minaPubKeyBase58: minaAddress,
          ethPubKeyBase58: ethAddress,
        });
        sendDepositMachine({
          type: "ASSIGN_WORKER",
          mintWorkerClient: mintWorker,
        });
      }
    }
  }, [minaAddress, ethAddress, mintWorker, sendDepositMachine]);

  // Helper functions
  const setDepositNumber = (depositNumber: number) => {
    sendDepositMachine({ type: "SET_DEPOSIT_NUMBER", value: depositNumber });
  };

  const setPresentation = (presentationJsonStr: string) => {
    console.log("Setting presentation:", presentationJsonStr);
  };

  const retry = () => {
    sendDepositMachine({ type: "CHECK_STATUS" });
  };

  const reset = () => {
    sendDepositMachine({ type: "RESET" });
  };

  // Type-safe current state
  const currentState = depositState.value as DepositStates;

  // Type-safe state checkers (replaces all your matches calls)
  const stateCheckers: StateCheckers = useMemo(() => {
    const states: DepositStates[] = [
      "hydrating",
      "checking",
      "noActiveDepositNumber",
      "hasActiveDepositNumber",
      "needsToCheckSetupStorageOrWaitingForStorageSetupFinalization",
      "setupStorageOnChainCheck",
      "setupStorage",
      "submitSetupStorageTx",
      "waitForStorageSetupFinalization",
      "monitoringDepositStatus",
      "computeEthProof",
      "hasComputedEthProof",
      "buildingMintTx",
      "submittingMintTx",
      "error",
      "missedOpportunity",
      "completed",
    ];

    return states.reduce((acc, state) => {
      acc[state] = depositState.matches(state);
      return acc;
    }, {} as StateCheckers);
  }, [depositState]);

  // Derived state flags using type-safe checkers
  const isLoading =
    stateCheckers.hydrating ||
    stateCheckers.checking ||
    stateCheckers.needsToCheckSetupStorageOrWaitingForStorageSetupFinalization ||
    stateCheckers.computeEthProof ||
    stateCheckers.buildingMintTx ||
    stateCheckers.submittingMintTx;

  const isReady =
    stateCheckers.monitoringDepositStatus ||
    stateCheckers.hasComputedEthProof;

  const isError =
    stateCheckers.error || depositState.context.errorMessage !== null;

  const canSetupStorage = depositState.context.goToSetupStorage;

  const bridgeStage = bridgeState.value as unknown as string;
  const bridgeStateElapsedSec = bridgeState.context.bridgeStatus?.elapsed_sec;
  const bridgeStateTimeRemaining =
    bridgeState.context.bridgeStatus?.time_remaining_sec;

  const depositNumber = depositState.context.activeDepositNumber;
  const hasActiveDeposit = depositNumber !== null;

  const depositStatus =
    depositState.context.processingStatus?.deposit_processing_status;
  const depositStatusStepIndex =
    depositStatus !== undefined
      ? ReplacementDepositProcessingStatusValues.indexOf(depositStatus)
      : -1;
  const depositBridgeStageName =
    depositState.context.processingStatus?.stage_name;
  const depositBridgeStageIndex =
    depositBridgeStageName !== undefined
      ? ReplacementStageNameValues.indexOf(depositBridgeStageName)
      : -1;

  // react state for the last tick of this callback
  const depositStepElapsedTime =
    depositState.context.processingStatus?.elapsed_sec;
  const depositStepTimeRemaining =
    depositState.context.processingStatus?.time_remaining_sec; // use 0 for ... come back to this

  // Derived state
  const contextValue = useMemo(
    () => ({
      // Machine state and actions with proper typing
      state: {
        value: depositState.value as DepositStateValue,
        context: depositState.context,
        fullState: depositState,
      },
      send: sendDepositMachine,

      // Type-safe state checkers
      is: stateCheckers,
      currentState,

      // Convenience flags
      isLoading,
      isReady,
      isError,
      canSetupStorage,

      // Current bridge stage data
      bridgeStage,
      bridgeStateElapsedSec,
      bridgeStateTimeRemaining,

      // Current deposit status
      depositNumber,
      hasActiveDeposit,
      depositStatus,
      depositStatusStepIndex,
      depositBridgeStageName,
      depositBridgeStageIndex,
      depositStepElapsedTime,
      depositStepTimeRemaining,

      // Helper methods
      setDepositNumber,
      setPresentation,
      retry,
      reset,
    }),
    [
      depositState,
      sendDepositMachine,
      stateCheckers,
      currentState,
      isLoading,
      isReady,
      isError,
      canSetupStorage,
      bridgeStage,
      bridgeStateElapsedSec,
      bridgeStateTimeRemaining,
      depositNumber,
      hasActiveDeposit,
      depositStatus,
      depositStatusStepIndex,
      depositBridgeStageName,
      depositBridgeStageIndex,
      depositStepElapsedTime,
      depositStepTimeRemaining,
      setDepositNumber,
      setPresentation,
      retry,
      reset,
    ]
  );

  return (
    <NoriBridgeContext.Provider value={contextValue}>
      {children}
    </NoriBridgeContext.Provider>
  );
};

export const useNoriBridge = () => {
  const context = useContext(NoriBridgeContext);
  if (!context) {
    throw new Error("useNoriBridge must be used within a NoriBridgeProvider");
  }
  return context;
};
