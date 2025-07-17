This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Bridging State Machine (`xstate`)

This project uses [XState v5](https://xstate.js.org/docs/) to manage a complex, multi-step asset bridging workflow involving zkApp credentials and Ethereum smart contracts.

---

## 🧠 Overview

This state machine manages an asynchronous flow across several key steps (at the moment):

1. **Credential creation** via zkApp.
2. **Storing** the credential.
3. **Locking tokens** on a smart contract.
4. **Retrieving** the amount of locked tokens.

XState ensures that:

- Each step is deterministic and follows strict transitions.
- Errors are handled in a unified `error` state.
- Async behavior (e.g., contract calls) is cleanly modeled with actors.
- Reusability and clarity are preserved with typed context and events.

---

### 🧩 Context

```ts
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
}
```

### 🎯 Events

Events are dispatched to transition the state machine:

```ts
type BridgingEvents =
  | { type: "CREATE_CREDENTIAL"; ... }
  | { type: "STORE_CREDENTIAL"; ... }
  | { type: "START_LOCK"; amount: number }
  | { type: "GET_LOCKED_TOKENS" }
  | { type: "RETRY" }
  | { type: "RESET" }
  | { type: "UPDATE_MACHINE"; zkappWorkerClient; contract }
```

### ⚙️ Actors (Async Tasks)

These represent background work or side effects:

- createEcdsaCredential: Uses zkappWorkerClient to generate a credential.
- storeCredential: Saves credential to Mina wallet.
- lockTokens: Sends an Ethereum tx to lock tokens.
- getLockedTokens: Reads locked token value from the smart contract.

Each actor is invoked using fromPromise() and attached via invoke blocks.

### 🔁 State Flow
stateDiagram-v2
[*] --> idle
idle --> creating: CREATE_CREDENTIAL
creating --> success: onDone
creating --> error: onError
success --> storing: STORE_CREDENTIAL
storing --> stored: onDone
stored --> locking: START_LOCK
locking --> locked: onDone
locked --> gettingLockedTokens: GET_LOCKED_TOKENS
gettingLockedTokens --> gotLockedTokens: onDone
error --> creating: RETRY
any --> idle: RESET

### 🔤 Syntax Glossary

| Syntax            | Meaning                                 |
| ----------------- | --------------------------------------- |
| `setup()`         | Declares types and async actors         |
| `createMachine()` | Defines the statechart itself           |
| `context`         | Persistent app state across transitions |
| `on: {}`          | Defines event-based transitions         |
| `assign()`        | Updates context in a safe and typed way |
| `invoke: {}`      | Runs async actors inside a state        |
| `guard()`         | Adds conditions to transition decisions |
| `fromPromise()`   | Wraps async functions as machine actors |

### 🚀 Usage
In App or Component

```ts
const [state, send] = useMachine(BridgingMachine, {
input: { zkappWorkerClient }
});

send({ type: "CREATE_CREDENTIAL", ... });
```

React to Transitions

```ts
if (state.matches("locked")) {
  console.log("Ready to fetch locked tokens!");
}
```

Reset or Retry

```ts
send({ type: "RESET" }); // Starts over
send({ type: "RETRY" }); // Retries the last step
```

➕ How to

1. Add to context.step (optional but helpful for tracking)

```ts
step: "create" | "store" | "lock" | "getLockedTokens" | "newStep";
```

2. Add a new actor (in setup())

   ```ts
   newAsyncActor: fromPromise(async ({ input }) => {
   // Your async logic here
   }),
   ```

3. Add new state in the machine

   ```ts
   newStep: {
        invoke: {
            src: "newAsyncActor",
            input: ({ context }) => ({ ... }),
            onDone: {
                target: "nextState",
                actions: assign({ ... })
            },
            onError: {
                target: "error",
                actions: assign({
                    errorMessage: ({ event }) => event.error.message
                }),
            },
        },
   }
   ```

4. Trigger the new step from an earlier state

   ```ts
   stored: {
    on: {
        NEW_STEP: {
        target: "newStep",
        actions: assign({ step: "newStep" })
        }
    }
   }
   ```

### ✅ What is UPDATE_MACHINE for?

The UPDATE_MACHINE event in this BridgingMachine is used to dynamically inject or update dependencies in the machine’s context after it has already started running. When we initialize the XState machine via useMachine(BridgingMachine, { input: { zkappWorkerClient } }), we can only pass the initial context (in this case, zkappWorkerClient). But in this app, some values like zkappWorkerClient and contract may become available asynchronously (e.g., once a wallet connects or a worker initializes).

Since XState’s machine context is immutable after setup, unless we explicitly allow updates using an event like UPDATE_MACHINE, this is the only way to safely mutate the machine’s state to include those late-loaded dependencies.
