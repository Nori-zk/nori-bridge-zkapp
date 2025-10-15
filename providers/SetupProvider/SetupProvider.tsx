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
import { Store } from "@/helpers/localStorage2.ts";

const SetupContext = createContext<SetupContextType | null>(null);

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

  /*useEffect(() => {
    console.log("Setup useEffect running...");
    let firebaseToken: string | null = Store.global().firebaseToken || null;
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("firebaseToken");

    console.log("URL params:", window.location.search);
    console.log("LocalStorage token:", firebaseToken);
    console.log("URL token:", urlToken);

    // Prefer URL param if present
    if (urlToken) {
      firebaseToken = urlToken;
      Store.global().firebaseToken = urlToken;
      console.log("Saved token to localStorage:", urlToken);

      // Strip token from URL without refresh
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

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
      console.log("No token found or already signed in, skipping sign-in");
    }
  }, []);*/

  /*useEffect(() => {
    if (isSignedIn) return; // Already signed in, skip

    console.log("Setup useEffect running...");

    let firebaseToken: string | null = Store.global().firebaseToken || null;
    const refreshToken: string | null =
      Store.global().firebaseRefreshToken || null;
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("firebaseToken");

    if (urlToken) {
      firebaseToken = urlToken;
      Store.global().firebaseToken = urlToken;
      console.log("Saved token to localStorage:", urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const signInWithToken = async (token: string) => {
      try {
        await signInWithCustomToken(auth, token);
        setIsSignedIn(true);
        console.log("Firebase sign-in successful");
        return true;
      } catch (err) {
        console.error("Firebase sign-in failed:", err);
        return false;
      }
    };

    const refreshAndSignIn = async () => {
      if (!refreshToken) return false;
      try {
        const res = await fetch(`/api/refresh-firebase-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) throw new Error("Failed to refresh token");
        const data = await res.json();
        if (!data.firebaseToken) throw new Error("No token returned");
        Store.global().firebaseToken = data.firebaseToken;
        return signInWithToken(data.firebaseToken);
      } catch (err) {
        console.error("Firebase token refresh failed:", err);
        return false;
      }
    };

    (async () => {
      let success = false;
      if (firebaseToken) {
        success = await signInWithToken(firebaseToken);
      }
      if (!success) {
        success = await refreshAndSignIn();
      }
      if (!success) {
        Store.global().firebaseToken = null;
        Store.global().firebaseRefreshToken = null;
        console.log("Cleared invalid tokens from localStorage");
      }
    })();
  }, [isSignedIn]);*/

  const contextValue = useMemo<SetupContextType>(
    () => ({
      ...getBridgeSocketSingleton(),
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
