import { createMachine, assign } from "xstate";
import { createContext, useContext } from "react";
import { useMachine } from "@xstate/react";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

type BridgingContext = {
  credential: string | null;
  error: string | null;
};

type BridgingEvent =
  | {
      type: "CREATE_CREDENTIAL";
      message: string;
      publicKey: string;
      signature: string;
      walletAddress: string;
    }
  | { type: "RESET" };

type BridgingState =
  | { value: "idle"; context: BridgingContext }
  | { value: "creating"; context: BridgingContext }
  | { value: "success"; context: BridgingContext }
  | { value: "error"; context: BridgingContext };

const bridgingMachine = createMachine({
  id: "bridging",
  initial: "idle",
  context: { credential: null, error: null } as BridgingContext,
  states: {
    idle: {
      on: {
        CREATE_CREDENTIAL: { target: "creating" },
      },
    },
    creating: {
      invoke: {
        src: (context, event: BridgingEvent, { data }) =>
          event.type === "CREATE_CREDENTIAL"
            ? data.zkappWorkerClient
              ? data.zkappWorkerClient.createEcdsaCredential(
                  event.message,
                  event.publicKey,
                  event.signature,
                  event.walletAddress
                )
              : Promise.reject("Worker not ready")
            : Promise.reject("Invalid event"),
        onDone: {
          target: "success",
          actions: assign({
            credential: (_, event) => event.data,
            error: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: (_, event) => String(event.data),
            credential: null,
          }),
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({ credential: null, error: null }),
        },
      },
    },
    error: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({ credential: null, error: null }),
        },
        CREATE_CREDENTIAL: { target: "creating" },
      },
    },
  },
});

const BridgingContext = createContext<{
  state: BridgingState;
  send: (event: BridgingEvent) => void;
}>({
  state: { value: "idle", context: { credential: null, error: null } },
  send: () => {},
});

export const BridgingProvider = ({ children }) => {
  const { zkappWorkerClient, isLoading } = useZkappWorker();
  const [state, send] = useMachine(bridgingMachine, {
    context: { credential: null, error: null },
    services: {
      creating: (context, event: BridgingEvent) =>
        event.type === "CREATE_CREDENTIAL"
          ? zkappWorkerClient
            ? zkappWorkerClient.createEcdsaCredential(
                event.message,
                event.publicKey,
                event.signature,
                event.walletAddress
              )
            : Promise.reject("Worker not ready")
          : Promise.reject("Invalid event"),
    },
  });

  return (
    <BridgingContext.Provider value={{ state, send }}>
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
