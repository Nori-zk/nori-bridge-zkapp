"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth } from "@/config/firebaseConfig.ts";
import {
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User,
} from "firebase/auth";
import { Store } from "@/helpers/localStorage2.ts";

type AuthContextType = {
  user: User | null;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  //const refreshHandle = useRef<NodeJS.Timeout | null>(null);

  // On mount: handle URL params and attempt custom-token sign-in
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("firebaseToken");

    if (urlToken) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const trySignIn = async () => {
      if (auth.currentUser) return;

      try {
        if (urlToken) {
          await signInWithCustomToken(auth, urlToken);
          Store.global().firebaseLoggedIn = true;
          setIsSignedIn(true);
          console.log("Signed in with custom token successfully.");
        }
      } catch (err) {
        console.warn("Custom token sign-in failed:", err);
        Store.global().firebaseLoggedIn = null;
        setIsSignedIn(false);
      }
    };

    void trySignIn();
  }, []);

  // Sync Firebase auth state
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (u) => {
      if (!u) {
        setUser(null);
        setIsSignedIn(false);
        Store.global().firebaseLoggedIn = null;
        return;
      }
      setUser(u);
      setIsSignedIn(true);
      Store.global().firebaseLoggedIn = true;
    });

    return () => unsubscribe();
  }, []);

  // Not convinced this is needed in v2
  // Force refresh periodically (every 4 minutes)
  /*useEffect(() => {
    const intervalMs = 4 * 60 * 1000;

    const refreshFn = async () => {
      const u = auth.currentUser;
      if (!u || !Store.global().firebaseLoggedIn) {
        if (refreshHandle.current) {
          clearInterval(refreshHandle.current);
          refreshHandle.current = null;
        }
        return;
      }
      try {
        await u.getIdToken(true); // force refresh
        console.log("Token refreshed successfully.");
      } catch (err) {
        console.error("Token refresh failed:", err);
        await signOut();
      }
    };

    refreshHandle.current = setInterval(refreshFn, intervalMs);
    return () => {
      if (refreshHandle.current) clearInterval(refreshHandle.current);
    };
  }, []);*/

  // this is just for development
  useEffect(() => {
    const handle = setInterval(async () => {
      console.log('checking for firebase login', Store.global().firebaseLoggedIn);
      if (Store.global().firebaseLoggedIn === null && auth.currentUser) {
        await signOut();
      }
    }, 1000);
    return () => clearInterval(handle);
  }, []);

  const signOut = async () => {

    try {
      console.log('Signing-out firebase');
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Sign-out failed:", err);
    }

    /*if (refreshHandle.current) {
      clearInterval(refreshHandle.current);
      refreshHandle.current = null;
    }*/

    console.log('Signed-out firebase');

    Store.global().firebaseLoggedIn = null;
    setUser(null);
    setIsSignedIn(false);
  };

  const getIdToken = async () => {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      return await u.getIdToken();
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isSignedIn, signOut, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
