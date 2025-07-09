import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { setup, fromPromise, assign } from "xstate";

interface BridgingContext {
  zkappWorkerClient: ZkappWorkerClient | null;
  credential: string | null;
  errorMessage: string | null;
  lastInput?: {
    message: string;
    address: string;
    signature: string;
    walletAddress: string;
  };
}

type BridgingEvents =
  | {
      type: "CREATE_CREDENTIAL";
      message: string;
      address: string;
      signature: string;
      walletAddress: string;
    }
  | { type: "RETRY" }
  | { type: "RESET" }
  | { type: "UPDATE_WORKER"; zkappWorkerClient: ZkappWorkerClient | null };

export const BridgingMachine = setup({
  types: {
    context: {} as BridgingContext,
    events: {} as BridgingEvents,
    input: {} as { zkappWorkerClient: ZkappWorkerClient | null },
  },
  actors: {
    createEcdsaCredential: fromPromise(
      async ({
        input,
      }: {
        input: {
          zkappWorkerClient: ZkappWorkerClient | null;
          message: string;
          address: string;
          signature: string;
          walletAddress: string;
        };
      }) => {
        if (!input.zkappWorkerClient) {
          throw new Error("Worker not ready - bridge");
        }
        return input.zkappWorkerClient.createEcdsaCredential(
          input.message,
          input.address,
          input.signature,
          input.walletAddress
        );
      }
    ),
  },
}).createMachine({
  id: "bridging",
  initial: "idle",
  context: ({ input }) => ({
    zkappWorkerClient: input.zkappWorkerClient,
    credential: null,
    errorMessage: null,
    lastInput: undefined,
  }),
  states: {
    idle: {
      on: {
        CREATE_CREDENTIAL: [
          {
            guard: ({ context }) => !!context.zkappWorkerClient,
            target: "creating",
            actions: assign({
              credential: null,
              errorMessage: null,
              lastInput: ({ event }) =>
                event.type === "CREATE_CREDENTIAL" ? event : undefined,
            }),
          },
          {
            target: "error",
            actions: assign({
              errorMessage: "Worker not ready - bridge",
            }),
          },
        ],
        UPDATE_WORKER: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
    creating: {
      invoke: {
        src: "createEcdsaCredential",
        input: ({ context, event }) => ({
          zkappWorkerClient: context.zkappWorkerClient,
          message:
            event.type === "CREATE_CREDENTIAL"
              ? event.message
              : context.lastInput?.message || "",
          address:
            event.type === "CREATE_CREDENTIAL"
              ? event.address
              : context.lastInput?.address || "",
          signature:
            event.type === "CREATE_CREDENTIAL"
              ? event.signature
              : context.lastInput?.signature || "",
          walletAddress:
            event.type === "CREATE_CREDENTIAL"
              ? event.walletAddress
              : context.lastInput?.walletAddress || "",
        }),
        onDone: {
          target: "success",
          actions: assign({
            credential: ({ event }) => event.output,
            errorMessage: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            errorMessage: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
          }),
        },
        UPDATE_WORKER: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "creating",
          guard: ({ context }) =>
            !!context.lastInput && !!context.zkappWorkerClient,
        },
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
          }),
        },
        UPDATE_WORKER: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
  },
});
