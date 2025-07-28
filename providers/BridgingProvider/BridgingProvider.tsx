import { createContext, useContext, useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import { BridgingMachine } from "@/machines/BridgingMachine.ts";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";
import type ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { Contract } from "ethers";
import { useMetaMaskWallet } from "../MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";

interface BridgingContextValue {
  state: {
    value: string;
    context: {
      zkappWorkerClient: ZkappWorkerClient | null;
      contract: Contract | null;
      credential: string | null;
      errorMessage: string | null;
      step: "create" | "obtain" | "lock" | "getLockedTokens";
      lastInput?: {
        message: string;
        address: string;
        signature: string;
        walletAddress: string;
        provider: any;
      };
      lockedAmount: string | null;
      attestationHash?: string;
    };
  };
  send: (
    event:
      | {
          type: "CREATE_CREDENTIAL";
          message: string;
          address: string;
          signature: string;
          walletAddress: string;
          provider: any;
        }
      | { type: "OBTAIN_CREDENTIAL" }
      | { type: "START_LOCK"; amount: number; attestationHash: string }
      | { type: "GET_LOCKED_TOKENS" }
      | { type: "RETRY" }
      | { type: "RESET" }
      | {
          type: "UPDATE_MACHINE";
          zkappWorkerClient: ZkappWorkerClient | null;
          contract: Contract | null;
        }
  ) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const BridgingContext = createContext<BridgingContextValue | null>(null);

export const BridgingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { zkappWorkerClient, isLoading: isWorkerLoading } = useZkappWorker();
  const { contract } = useMetaMaskWallet();
  const [state, send] = useMachine(BridgingMachine, {
    input: { zkappWorkerClient },
  });

  useEffect(() => {
    console.log(
      "zkappWorkerClient inside BridgingProvider:",
      zkappWorkerClient
    );
    console.log("contract inside BridgingProvider:", contract);
    send({ type: "UPDATE_MACHINE", zkappWorkerClient, contract });
  }, [zkappWorkerClient, contract, send]);

  const value = useMemo(
    () => ({
      state,
      send,
      isLoading:
        state.matches("creating") ||
        state.matches("obtaining") ||
        state.matches("locking") ||
        state.matches("gettingLockedTokens") ||
        isWorkerLoading,
      isSuccess:
        state.matches("success") ||
        state.matches("obtained") ||
        state.matches("locked") ||
        state.matches("gotLockedTokens"),
      isError: state.matches("error"),
    }),
    [state, send, isWorkerLoading]
  );

  return (
    <BridgingContext.Provider value={value}>
      {children}
    </BridgingContext.Provider>
  );
};

export const useBridging = () => {
  const context = useContext(BridgingContext);
  if (!context) {
    throw new Error("useBridging must be within a BridgingProvider");
  }
  return context;
};
