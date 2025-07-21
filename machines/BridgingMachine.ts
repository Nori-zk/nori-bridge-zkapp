import { setup, fromPromise, assign } from "xstate";
import type ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { Contract, ethers } from "ethers";

interface BridgingContext {
  zkappWorkerClient: ZkappWorkerClient | null;
  contract: Contract | null;
  credential: string | null;
  errorMessage: string | null;
  step: "create" | "store" | "lock" | "getLockedTokens";
  lastInput?: {
    message: string;
    address: string;
    signature: string;
    walletAddress: string;
  };
  lockedAmount: string | null;
  attestationHash?: string;
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
  | {
      type: "START_LOCK";
      amount: number;
      attestationHash: string;
    }
  | {
      type: "GET_LOCKED_TOKENS";
    }
  | { type: "RETRY" }
  | { type: "RESET" }
  | {
      type: "UPDATE_MACHINE";
      zkappWorkerClient: ZkappWorkerClient | null;
      contract: Contract | null;
    };

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
        try {
          await input.provider.request({
            method: "mina_storePrivateCredential",
            params: [JSON.parse(input.credential)],
          });
        } catch (error) {
          // if (!result.success) {
          throw new Error("Failed to store credential");
          // }
          // return result;
        }
      }
    ),
    lockTokens: fromPromise(
      async ({
        input,
      }: {
        input: {
          zkappWorkerClient: ZkappWorkerClient | null;
          contract: Contract;
          amount: number;
          attestationHash: string;
        };
      }) => {
        if (!input.amount || isNaN(input.amount)) {
          throw new Error("Invalid amount");
        }

        const fakeAttestationHash = "12345";

        const parsedAmount = parseFloat(fakeAttestationHash);

        const value = ethers.parseEther(input.amount.toString());

        console.log(
          `Locking tokens with amount: ${input.amount}, attestationHash: ${parsedAmount}`
        );

        const tx = await input.contract.lockTokens(parsedAmount, {
          value,
        });
        await tx.wait();
      }
    ),
    getLockedTokens: fromPromise(
      async ({
        input,
      }: {
        input: {
          zkappWorkerClient: ZkappWorkerClient | null;
          contract: Contract;
          lastInput?: {
            walletAddress: string;
          };
        };
      }) => {
        const amount = await input.contract.lockedTokens(
          input.lastInput?.walletAddress
        );
        const formattedAmount = ethers.formatEther(amount);
        console.log(
          `Locked tokens for ${input.lastInput?.walletAddress}: ${formattedAmount}`
        );
        return formattedAmount;
      }
    ),
  },
}).createMachine({
  id: "bridging",
  initial: "idle",
  context: ({ input }) => ({
    zkappWorkerClient: input.zkappWorkerClient,
    contract: null,
    credential: null,
    errorMessage: null,
    step: "create",
    lastInput: undefined,
    lockedAmount: null,
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
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
            contract: ({ event }) => event.contract,
          }),
        },
        STORE_CREDENTIAL: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot store credential before creating one",
          }),
        },
        START_LOCK: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot lock tokens before storing credentials",
          }),
        },
        GET_LOCKED_TOKENS: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot get locked tokens before locking",
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
            lockedAmount: null,
          }),
        },
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
        START_LOCK: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot lock tokens before storing credentials",
          }),
        },
        GET_LOCKED_TOKENS: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot get locked tokens before locking",
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
            step: "lock",
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
        START_LOCK: [
          {
            guard: ({ context }) => !!context.zkappWorkerClient,
            target: "locking",
            actions: assign({
              errorMessage: null,
              attestationHash: ({ event }) =>
                event.type === "START_LOCK" ? event.attestationHash : undefined,
            }),
          },
          {
            target: "error",
            actions: assign({
              errorMessage: "Worker not ready - bridge",
            }),
          },
        ],
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
            lockedAmount: null,
            attestationHash: undefined, // optional: clear on reset
          }),
        },
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
        GET_LOCKED_TOKENS: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot get locked tokens before locking",
          }),
        },
      },
    },
    locking: {
      invoke: {
        src: "lockTokens",
        input: ({ context, event }) => ({
          zkappWorkerClient: context.zkappWorkerClient,
          amount: event.type === "START_LOCK" ? event.amount : 0,
          attestationHash:
            event.type === "START_LOCK" ? event.attestationHash : "",
          contract: context.contract!,
        }),
        onDone: {
          target: "locked",
          actions: assign({
            errorMessage: null,
            step: "getLockedTokens",
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
    locked: {
      on: {
        GET_LOCKED_TOKENS: [
          {
            guard: ({ context }) => !!context.zkappWorkerClient,
            target: "gettingLockedTokens",
            actions: assign({
              errorMessage: null,
            }),
          },
          {
            target: "error",
            actions: assign({
              errorMessage: "Worker not ready - bridge",
            }),
          },
        ],
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
            lockedAmount: null,
          }),
        },
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
    gettingLockedTokens: {
      invoke: {
        src: "getLockedTokens",
        input: ({ context }) => ({
          zkappWorkerClient: context.zkappWorkerClient,
          contract: context.contract!,
          lastInput: context.lastInput,
        }),
        onDone: {
          target: "gotLockedTokens",
          actions: assign({
            lockedAmount: ({ event }) => event.output,
            errorMessage: null,
            step: "getLockedTokens",
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
    gotLockedTokens: {
      on: {
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
            lockedAmount: null,
          }),
        },
        UPDATE_MACHINE: {
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
            !!context.lastInput &&
            !!context.zkappWorkerClient &&
            context.step === "create",
        },
        RESET: {
          target: "idle",
          actions: assign({
            credential: null,
            errorMessage: null,
            lastInput: undefined,
            step: "create",
            lockedAmount: null,
          }),
        },
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
          }),
        },
      },
    },
  },
});
