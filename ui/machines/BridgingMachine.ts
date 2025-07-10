import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { setup, fromPromise, assign } from "xstate";

interface BridgingContext {
  zkappWorkerClient: ZkappWorkerClient | null;
  credential: string | null;
  errorMessage: string | null;
  step: "create" | "store";
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
  | {
      type: "STORE_CREDENTIAL";
      provider: any;
      credential: string;
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
    storeCredential: fromPromise(
      async ({
        input,
      }: {
        input: {
          provider: any;
          credential: string;
        };
      }) => {
        console.log("Storing credential:", input.credential);
        await input.provider.request({
          method: "mina_storePrivateCredential",
          params: [JSON.parse(input.credential)],
        });

        // console.log("Store credential result:", result);

        // if (!result.success) {
        //   throw new Error("Failed to store credential");
        // }
        // return result;
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
    step: "create",
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
        STORE_CREDENTIAL: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot store credential before creating one",
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
            step: "store",
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
        STORE_CREDENTIAL: {
          target: "storing",
          actions: assign({
            errorMessage: null,
          }),
        },
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
          }),
        },
        UPDATE_WORKER: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
    storing: {
      invoke: {
        src: "storeCredential",
        input: ({ context, event }) => ({
          provider: event.type === "STORE_CREDENTIAL" ? event.provider : null,
          credential:
            event.type === "STORE_CREDENTIAL"
              ? event.credential
              : context.credential || "",
        }),
        onDone: {
          target: "stored",
          actions: assign({
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
    stored: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
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
