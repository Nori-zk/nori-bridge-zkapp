import { createContext, useContext, useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import { BridgingMachine } from "@/machines/BridgingMachine.ts";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";
import type ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";

interface BridgingContextValue {
  state: {
    value: string;
    context: {
      zkappWorkerClient: ZkappWorkerClient | null;
      credential: string | null;
      errorMessage: string | null;
      lastInput?: {
        message: string;
        address: string;
        signature: string;
        walletAddress: string;
      };
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
        }
      | { type: "RETRY" }
      | { type: "RESET" }
      | { type: "UPDATE_WORKER"; zkappWorkerClient: ZkappWorkerClient | null }
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
  const [state, send] = useMachine(BridgingMachine, {
    input: { zkappWorkerClient },
  });

  useEffect(() => {
    // console.log(
    //   "zkappWorkerClient inside BridgingProvider:",
    //   zkappWorkerClient
    // );
    send({ type: "UPDATE_WORKER", zkappWorkerClient });
  }, [zkappWorkerClient, send]);

  const value = useMemo(
    () => ({
      state,
      send,
      isLoading: state.matches("creating") || isWorkerLoading,
      isSuccess: state.matches("success"),
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
    throw new Error("useBridging must be used within a BridgingProvider");
  }
  return context;
};
