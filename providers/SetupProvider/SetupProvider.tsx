"use client"
import getBridgeSocketSingleton from "@/singletons/bridge.ts";
import { type getReconnectingBridgeSocket$ } from "@nori-zk/mina-token-bridge/rx/socket";
import {
  type getBridgeStateTopic$,
  type getBridgeTimingsTopic$,
  type getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import { createContext, useContext, useMemo } from "react";

type SetupContextType = {
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  bridgeSocketConnectionState$: ReturnType<
    typeof getReconnectingBridgeSocket$
  >["bridgeSocketConnectionState$"];
};
const SetupContext = createContext<SetupContextType | null>(null);

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const contextValue = useMemo(
    () => (getBridgeSocketSingleton()),
    []
  );
  return (
    <SetupContext.Provider value={contextValue}>
      {children}
    </SetupContext.Provider>
  );
};

export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
};
