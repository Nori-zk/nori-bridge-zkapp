import { setup, fromPromise, assign } from "xstate";
import type ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { Contract, ethers } from "ethers";

interface BridgingContext {
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
}

type BridgingEvents =
  | {
      type: "CREATE_CREDENTIAL";
      message: string;
      address: string;
      signature: string;
      walletAddress: string;
      provider: any;
    }
  | {
      type: "OBTAIN_CREDENTIAL";
      provider: any;
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
      credential?: string | null;
      step?: "create" | "obtain" | "lock" | "getLockedTokens";
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
          provider: any;
        };
      }) => {
        try {
          if (!input.zkappWorkerClient) {
            throw new Error("Worker not ready - bridge");
          }
          const credential =
            await input.zkappWorkerClient.createEcdsaCredential(
              input.message,
              input.address,
              input.signature,
              input.walletAddress
            );
          await input.provider.request({
            method: "mina_storePrivateCredential",
            params: [JSON.parse(credential)],
          });
          return credential;
        } catch (error) {
          console.error("Failed to create and store credential:", error);
          throw new Error("Failed to create and store credential");
        }
      }
    ),
    obtainCredential: fromPromise(
      async ({
        input,
      }: {
        input: {
          zkappWorkerClient: ZkappWorkerClient | null;
          provider: any;
        };
      }) => {
        if (!input.zkappWorkerClient) {
          throw new Error("Worker not ready - bridge");
        }
        const request =
          await input.zkappWorkerClient.obtainPresentationRequest();
        const result = await input.provider.request({
          method: "mina_requestPresentation",
          params: [
            {
              presentationRequest: JSON.parse(request as string),
            },
          ],
        });
        console.log("Presentation result:", result);
        return { credential: result, request };
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
        const fakeAttestationHash = "12345";
        const parsedAmount = parseFloat(fakeAttestationHash);
        const amount = await input.contract.lockedTokens(
          input.lastInput?.walletAddress,
          parsedAmount
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
          target: "idle",
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? "create",
          }),
        },
        OBTAIN_CREDENTIAL: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot obtain credential before creating one",
          }),
        },
        START_LOCK: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot lock tokens before obtaining credentials",
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
          provider:
            event.type === "CREATE_CREDENTIAL"
              ? event.provider
              : context.lastInput?.provider || null,
        }),
        onDone: {
          target: "success",
          actions: assign({
            credential: ({ event }) => event.output,
            errorMessage: null,
            step: "obtain",
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
        OBTAIN_CREDENTIAL: {
          target: "obtaining",
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
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? context.step,
          }),
        },
        START_LOCK: {
          target: "error",
          actions: assign({
            errorMessage: "Cannot lock tokens before obtaining credentials",
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
    obtaining: {
      invoke: {
        src: "obtainCredential",
        input: ({ context, event }) => ({
          zkappWorkerClient: context.zkappWorkerClient,
          provider:
            event.type === "OBTAIN_CREDENTIAL"
              ? event.provider
              : context.lastInput?.provider || null,
        }),
        onDone: {
          target: "obtained",
          actions: assign({
            credential: ({ event }) => event.output.credential,
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
    obtained: {
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
            attestationHash: undefined,
          }),
        },
        UPDATE_MACHINE: {
          actions: assign({
            zkappWorkerClient: ({ event }) => event.zkappWorkerClient,
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? context.step,
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
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? context.step,
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
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? context.step,
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
            contract: ({ event }) => event.contract,
            credential: ({ event }) => event.credential ?? null,
            step: ({ event }) => event.step ?? context.step,
          }),
        },
      },
    },
  },
});
