import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMachine } from "@xstate/react";
import {
  getDepositMachine,
  type DepositMintContext,
  type DepositMintEvents,
} from "@/machines/DepositMintMachine.ts";
import { useSetup } from "../SetupProvider/SetupProvider.tsx";
import { useMetaMaskWallet } from "../MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { NetworkId } from "o1js";
import { getBridgeMachine } from "@/machines/BridgeMachine.ts";

type NoriBridgeContextType = {
  // Machine state and actions
  state: {
    value: string;
    context: DepositMintContext;
  };
  send: (event: DepositMintEvents) => void;

  // Convenience flags
  isLoading: boolean;
  isReady: boolean;
  isError: boolean;
  canSetupStorage: boolean;
  canSubmitMintTx: boolean;

  // Helper methods
  setDepositNumber: (depositNumber: number) => void;
  setPresentation: (presentationJsonStr: string) => void;
  submitMintTx: () => void;
  retry: () => void;
  reset: () => void;
};

const minaConfig = {
  networkId: "devnet" as NetworkId,
  mina: "https://api.minascan.io/node/devnet/v1/graphql",
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
  const bridgeMachine = useMemo(()=> getBridgeMachine(bridgeStateTopic$, bridgeTimingsTopic$), [bridgeStateTopic$, bridgeTimingsTopic$]);

  // Use the bridge machine
  const [bridgeState, _] = useMachine(bridgeMachine);

  // Setup the depositMintMachine
  const depositMintMachine = useMemo(
    () =>
      getDepositMachine(
        {
          ethStateTopic$,
          bridgeStateTopic$,
          bridgeTimingsTopic$,
        },
        null
      ),
    [ethStateTopic$, bridgeStateTopic$, bridgeTimingsTopic$]
  );

  // Use the deposit machine
  const [depositState, sendDepositMachine] = useMachine(depositMintMachine);

  useEffect(() => {
    console.log("Effect ran:", { minaAddress, ethAddress, mintWorker });
    // TODO what if a user switches wallet, will need to generate new MintWorkerClient
    if (minaAddress && ethAddress && !mintWorker) {
      const worker = new ZkappMintWorkerClient(minaAddress, ethAddress);
      worker.minaSetup(minaConfig); // CHECK FOR RACE
      console.log("creating worker: ", worker);
      setMintWorker(worker);
      sendDepositMachine({ type: "ASSIGN_WORKER", mintWorkerClient: worker });
    }
  }, [minaAddress, ethAddress, mintWorker, sendDepositMachine]);

  // Helper functions

  /*
    The these function makes the dependencies of useMemo Hook change on every render. 
    Move them inside the useMemo callback. 
    Alternatively, wrap the definition of the functions in its own useCallback() Hook
  */

  const setDepositNumber = (depositNumber: number) => {
    sendDepositMachine({ type: "SET_DEPOSIT_NUMBER", value: depositNumber });
  };

  // Deprecated!
  const setPresentation = (presentationJsonStr: string) => {
    console.log("Setting presentation:", presentationJsonStr);
    // This will be read from localStorage by the machine
  };

  const submitMintTx = () => {
    sendDepositMachine({ type: "SUBMIT_MINT_TX" });
  };

  const retry = () => {
    sendDepositMachine({ type: "CHECK_STATUS" });
  };

  const reset = () => {
    sendDepositMachine({ type: "RESET" });
  };

  // Derived state flags
  const isLoading =
    depositState.matches("hydrating") ||
    depositState.matches("checking") ||
    depositState.matches("needsToCheckSetupStorageOrWaitingForStorageSetupFinalization") ||
    depositState.matches("computeEthProof") ||
    depositState.matches("buildingMintTx") ||
    depositState.matches("submittingMintTx");

  const isReady =
    depositState.matches("monitoringDepositStatus") ||
    depositState.matches("hasComputedEthProof") ||
    depositState.matches("hasDepositMintTx");

  const isError = depositState.matches("error") || depositState.context.errorMessage !== null;

  const canSetupStorage = depositState.context.goToSetupStorage; // state.matches("storageSetupDecision") && !

  const canSubmitMintTx = depositState.matches("hasDepositMintTx");

  const bridgeStage = bridgeState.value;
  const bridgeStateElapsedSec = bridgeState.context.bridgeStatus?.elapsed_sec;
  const bridgeStateTimeRemaining = bridgeState.context.bridgeStatus?.time_remaining_sec;

  const depositNumber = depositState.context.activeDepositNumber;
  const hasActiveDeposit = depositNumber !== null;

  const depositStatus = depositState.context.processingStatus?.deposit_processing_status; // This is waiting for eth finality, waiting for current job, waiting for previous job, missed mint oppertunity
  const depositBridgeStageName = depositState.context.processingStatus?.stage_name; // This is the current bridge heads stage this is only important when depositStatus is waiting for current job or waiting for previous job ignore otherwise
  const depositStepElapsedTime = depositState.context.processingStatus?.elapsed_sec; // This is the elapsed time for this step.
  const depositStepTimeRemaining = depositState.context.processingStatus?.time_remaining_sec; // This is the remaining time for this step.

  // Derived state
  const contextValue = useMemo(
    () => ({
      // Machine state and actions
      state: {
        value: depositState.value as string,
        context: depositState.context,
      },
      send: sendDepositMachine,

      // Convenience flags
      isLoading,
      isReady,
      isError,
      canSetupStorage,
      canSubmitMintTx,

      // Current bridge stage data
      bridgeStage,
      bridgeStateElapsedSec,
      bridgeStateTimeRemaining,

      // Current deposit status
      depositNumber,
      hasActiveDeposit,
      depositStatus,
      depositBridgeStageName,
      depositStepElapsedTime,
      depositStepTimeRemaining,

      // Helper methods
      setDepositNumber,
      setPresentation,
      submitMintTx,
      retry,
      reset,
    }),
    [
      depositState,
      sendDepositMachine,
      isLoading,
      isReady,
      isError,
      canSetupStorage,
      canSubmitMintTx,

      bridgeStage,
      bridgeStateElapsedSec,
      bridgeStateTimeRemaining,

      depositNumber,
      hasActiveDeposit,
      depositStatus,
      depositBridgeStageName,
      depositStepElapsedTime,
      depositStepTimeRemaining,

      setDepositNumber,
      setPresentation,
      submitMintTx,
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
