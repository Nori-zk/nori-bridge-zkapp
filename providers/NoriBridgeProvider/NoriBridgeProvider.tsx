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
import MockMintWorkerClient from "@/workers/mockMintWorkerClient.ts";
import { useSetup } from "../SetupProvider/SetupProvider.tsx";
import { useMetaMaskWallet } from "../MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";

// // Note the gotchas in the tests in the link above:

// // let depositMachine: ReturnType<typeof getDepositMachine>;
// const { bridgeSocket$ } = getReconnectingBridgeSocket$();

// // Seem to need to add share replay to avoid contention.
// const ethStateTopic$ = getEthStateTopic$(bridgeSocket$).pipe(shareReplay(1));
// const bridgeStateTopic$ = getBridgeStateTopic$(bridgeSocket$).pipe(
//   shareReplay(1)
// );
// const bridgeTimingsTopic$ = getBridgeTimingsTopic$(bridgeSocket$).pipe(
//   shareReplay(1)
// );
// // Turn the topics into hot observables... (this is slightly annoying to have to do)
// ethStateTopic$.subscribe();
// bridgeStateTopic$.subscribe();
// bridgeTimingsTopic$.subscribe();
// // Create single instance of worker
// // You must ensure we only have one global reference to bridgeSocket$, ethStateTopic$, bridgeTimingsTopic$ and bridgeStateTopic$
// // They must have:
// // .pipe(
// //     shareReplay(1)
// // )
// // Applied to them.

// // And you must turn them into hot observables aka the subscribe to them immediately within your global service. Otherwise they react very slowly
// // to bridge state changes.

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

const NoriBridgeContext = createContext<NoriBridgeContextType | null>(null);

export const NoriBridgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mintWorker, setMintWorker] = useState<MockMintWorkerClient | null>(
    null
  );

  const { ethStateTopic$, bridgeStateTopic$, bridgeTimingsTopic$ } = useSetup();
  const { walletAddress: ethAddress } = useMetaMaskWallet();
  const { address: minaAddress } = useAccount();

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

  // Use the machine
  const [state, send] = useMachine(depositMintMachine);

  useEffect(() => {
    // TODO what if a user switches wallet, will need to generate new MockMintWorkerClient
    if (minaAddress && ethAddress && !mintWorker) {
      const worker = new MockMintWorkerClient(minaAddress, ethAddress);
      console.log("creating worker: ", worker);
      setMintWorker(worker);
      send({ type: "ASSIGN_WORKER", mintWorkerClient: worker });
    }
  }, [minaAddress, ethAddress, mintWorker, send]);

  // Helper functions
  const setDepositNumber = (depositNumber: number) => {
    send({ type: "SET_DEPOSIT_NUMBER", value: depositNumber });
  };

  const setPresentation = (presentationJsonStr: string) => {
    console.log("Setting presentation:", presentationJsonStr);
    // This will be read from localStorage by the machine
  };

  const submitMintTx = () => {
    send({ type: "SUBMIT_MINT_TX" });
  };

  const retry = () => {
    send({ type: "CHECK_STATUS" });
  };

  const reset = () => {
    send({ type: "RESET" });
  };

  // Derived state flags
  const isLoading =
    state.matches("initializingMina") ||
    // state.matches("compilingWorker") ||
    state.matches("checkingStorageSetup") ||
    state.matches("settingUpStorage") ||
    state.matches("computingEthProof") ||
    state.matches("buildingMintTx") ||
    state.matches("submittingMintTx");

  const isReady =
    state.matches("monitoringDepositStatus") ||
    state.matches("hasComputedEthProof") ||
    state.matches("hasDepositMintTx");

  const isError = state.matches("error") || state.context.errorMessage !== null;

  const canSetupStorage =
    state.matches("storageSetupDecision") && !state.context.isStorageSetup;

  const canSubmitMintTx = state.matches("hasDepositMintTx");

  // Derived state
  const contextValue = useMemo(
    () => ({
      // Machine state and actions
      state: {
        value: state.value as string,
        context: state.context,
      },
      send,

      // Convenience flags
      isLoading,
      isReady,
      isError,
      canSetupStorage,
      canSubmitMintTx,

      // Helper methods
      setDepositNumber,
      setPresentation,
      submitMintTx,
      retry,
      reset,
    }),
    [
      state,
      send,
      isLoading,
      isReady,
      isError,
      canSetupStorage,
      canSubmitMintTx,
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
