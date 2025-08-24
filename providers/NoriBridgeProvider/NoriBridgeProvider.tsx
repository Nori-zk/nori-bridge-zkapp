import React, { createContext, useContext, useEffect, useMemo } from "react";
import { shareReplay } from 'rxjs'
import { useMachine } from "@xstate/react";

import { getReconnectingBridgeSocket$ } from '@nori-zk/mina-token-bridge/rx/socket';

import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from '@nori-zk/mina-token-bridge/rx/topics';

import { getDepositMachine, type DepositMintContext, type DepositMintEvents } from '@/machines/DepositMintMachine.ts';

// Note the gotchas in the tests in the link above:

// let depositMachine: ReturnType<typeof getDepositMachine>;
const { bridgeSocket$ } = getReconnectingBridgeSocket$();

// Seem to need to add share replay to avoid contention.
const ethStateTopic$ = getEthStateTopic$(bridgeSocket$).pipe(
  shareReplay(1)
);
const bridgeStateTopic$ = getBridgeStateTopic$(bridgeSocket$).pipe(
  shareReplay(1)
);
const bridgeTimingsTopic$ = getBridgeTimingsTopic$(bridgeSocket$).pipe(
  shareReplay(1)
);
// Turn the topics into hot observables... (this is slightly annoying to have to do)
ethStateTopic$.subscribe();
bridgeStateTopic$.subscribe();
bridgeTimingsTopic$.subscribe();

// You must ensure we only have one global reference to bridgeSocket$, ethStateTopic$, bridgeTimingsTopic$ and bridgeStateTopic$
// They must have:
// .pipe(
//     shareReplay(1)
// )
// Applied to them.

// And you must turn them into hot observables aka the subscribe to them immediately within your global service. Otherwise they react very slowly 
// to bridge state changes.

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
  setUserAddresses: (minaAddress: string, ethAddress: string) => void;
  setPresentation: (presentationJsonStr: string) => void;
  initWorker: () => void;
  setupStorage: () => void;
  submitMintTx: () => void;
  retry: () => void;
  reset: () => void;
};

const NoriBridgeContext = createContext<NoriBridgeContextType | null>(null);

export const NoriBridgeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Create machine instance
  const depositMintMachine = useMemo(() =>
    getDepositMachine({
      ethStateTopic$,
      bridgeStateTopic$,
      bridgeTimingsTopic$,
    }), []);



  // Use the machine
  const [state, send] = useMachine(depositMintMachine);

  // Helper functions
  const setDepositNumber = (depositNumber: number) => {
    send({ type: "SET_DEPOSIT_NUMBER", value: depositNumber });
  };

  const setUserAddresses = (minaAddress: string, ethAddress: string) => {
    // Update context directly since these aren't in the machine events yet
    // You may need to add these events to your machine
    console.log("Setting user addresses:", { minaAddress, ethAddress });
  };

  const setPresentation = (presentationJsonStr: string) => {
    // Update context directly since this isn't in the machine events yet
    console.log("Setting presentation:", presentationJsonStr);
  };

  const initWorker = () => {
    // This should trigger worker initialization in your machine
    console.log("Init worker called");
  };

  const setupStorage = () => {
    // This should trigger storage setup in your machine
    console.log("Setup storage called");
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
  const isLoading = state.matches("computingEthProof") || 
                   state.matches("buildingMintTx") || 
                   state.matches("submittingMintTx");
  
  const isReady = state.matches("hasActiveDepositNumber") || 
                 state.matches("hasComputedEthProof") || 
                 state.matches("hasDepositMintTx");
  
  const isError = state.context.errorMessage !== null;
  
  const canSetupStorage = state.context.isWorkerReady && 
                         !state.context.isStorageSetup && 
                         state.context.minaSenderAddress !== null;
  
  const canSubmitMintTx = state.matches("hasDepositMintTx");

  // Derived state
  const contextValue = useMemo(() => ({
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
    setUserAddresses,
    setPresentation,
    initWorker,
    setupStorage,
    submitMintTx,
    retry,
    reset,
  }), [
    state,
    send,
    isLoading,
    isReady,
    isError,
    canSetupStorage,
    canSubmitMintTx,
  ]);

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
