"use client";
import getBridgeSocketSingleton from "@/singletons/bridge.ts";
import { type getReconnectingBridgeSocket$ } from "@nori-zk/mina-token-bridge/rx/socket";
import {
  type getBridgeStateTopic$,
  type getBridgeTimingsTopic$,
  type getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SetupContextType = {
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  bridgeSocketConnectionState$: ReturnType<
    typeof getReconnectingBridgeSocket$
  >["bridgeSocketConnectionState$"];
};
import { signInWithCustomToken } from "firebase/auth";
import { auth, db } from "@/config/firebaseConfig.ts";

const SetupContext = createContext<SetupContextType | null>(null);

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    console.log("Setup useEffect running...");
    const urlParams = new URLSearchParams(window.location.search);
    const firebaseToken = urlParams.get("firebaseToken");
    console.log("URL params:", window.location.search);
    console.log("Extracted firebaseToken:", firebaseToken);

    if (firebaseToken && !isSignedIn) {
      console.log("Signing in with custom token...");
      signInWithCustomToken(auth, firebaseToken)
        .then(() => {
          console.log("Firebase sign-in successful");
          setIsSignedIn(true);
        })
        .catch((err) => {
          console.error("Firebase sign-in failed:", err);
        });
    } else {
      console.log("No token or already signed in, skipping sign-in");
    }
  }, [isSignedIn]);

  const contextValue = useMemo<SetupContextType>(
    () => ({
      ...getBridgeSocketSingleton(),
      auth,
      db,
    }),
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
