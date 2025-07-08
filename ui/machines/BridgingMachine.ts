import { setup, fromPromise, assign, createMachine } from "xstate";

interface BridgingContext {
  userData: any | null;
  posts: any[] | null;
  errorMessage: string | null;
}

type BridgingEvents = { type: "START" } | { type: "RETRY" } | { type: "RESET" };

const fetchUser = async (userId: string) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  );
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
};

const fetchPosts = async (userId: string) => {
  const response = await fetch(
    `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
  );
  if (!response.ok) throw new Error("Failed to fetch posts");
  return response.json();
};

export const bridgingMachine = setup({
  types: {
    context: {} as BridgingContext,
    events: {} as BridgingEvents,
  },
  actors: {
    fetchUser: fromPromise(({ input }: { input: { userId: string } }) =>
      fetchUser(input.userId)
    ),
    fetchPosts: fromPromise(({ input }: { input: { userId: string } }) =>
      fetchPosts(input.userId)
    ),
  },
}).createMachine({
  id: "bridging",
  initial: "idle",
  context: {
    userData: null,
    posts: null,
    errorMessage: null,
  },
  states: {
    idle: {
      on: {
        START: {
          target: "fetchingUser",
          actions: assign({
            userData: null,
            posts: null,
            errorMessage: null,
          }),
        },
      },
    },
    fetchingUser: {
      invoke: {
        src: "fetchUser",
        input: { userId: "1" },
        onDone: {
          target: "fetchingPosts",
          actions: assign({
            userData: ({ event }) => event.output,
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
    fetchingPosts: {
      invoke: {
        src: "fetchPosts",
        input: ({ context }) => ({ userId: context.userData.id }),
        onDone: {
          target: "success",
          actions: assign({
            posts: ({ event }) => event.output,
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
        RESET: "idle",
      },
    },
    error: {
      on: {
        RETRY: "fetchingUser",
        RESET: "idle",
      },
    },
  },
});
