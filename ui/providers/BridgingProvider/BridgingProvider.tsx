import { createContext, useContext, useMemo } from "react";
import { useMachine } from "@xstate/react";
import { bridgingMachine } from "@/machines/BridgingMachine.ts";

interface BridgingContextValue {
  state: {
    value: string;
    context: {
      userData: any | null;
      posts: any[] | null;
      errorMessage: string | null;
    };
  };
  send: (
    event: { type: "START" } | { type: "RETRY" } | { type: "RESET" }
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
  const [state, send] = useMachine(bridgingMachine);

  const value = useMemo(
    () => ({
      state,
      send,
      isLoading:
        state.matches("fetchingUser") || state.matches("fetchingPosts"),
      isSuccess: state.matches("success"),
      isError: state.matches("error"),
    }),
    [state, send]
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
