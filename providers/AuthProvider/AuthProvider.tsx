"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  // On mount: handle URL params (firebaseToken) and attempt sign-in with any token in Store.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("firebaseToken");

    if (urlToken) {
      Store.global().firebaseToken = urlToken;
      // remove token from URL without reloading
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const trySignIn = async () => {
      const token = Store.global().firebaseToken;
      if (!token) return;
      if (auth.currentUser) return; // already signed in

      try {
        await signInWithCustomToken(auth, token);
        // onIdTokenChanged will handle state update & storing tokens
      } catch (err) {
        console.error("signInWithCustomToken failed:", err);
        // token likely invalid — clear stored token
        Store.global().firebaseToken = null;
      }
    };

    void trySignIn();
  }, []);

  // Keep local Store in sync with Firebase SDK and maintain isSignedIn
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsSignedIn(false);
        Store.global().firebaseToken = null;
        return;
      }

      try {
        const token = await u.getIdToken();
        setUser(u);
        setIsSignedIn(true);
        Store.global().firebaseToken = token;
      } catch (err) {
        console.error("Failed to read ID token:", err);
        setUser(null);
        setIsSignedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Force refresh periodically (every 4 minutes) to keep tokens fresh and avoid expiry issues
  useEffect(() => {
    const intervalMs = 4 * 60 * 1000;
    const handle = setInterval(async () => {
      const u = auth.currentUser;
      if (!u) return;

      try {
        const token = await u.getIdToken(true); // force refresh — mandatory
        Store.global().firebaseToken = token;
        console.log('Refreshed token');
      } catch (err) {
        console.error("Forced token refresh failed:", err);
        // If refresh fails, clear and sign out to recover a clean state
        Store.global().firebaseToken = null;
        try {
          await firebaseSignOut(auth);
        } catch {}
        setUser(null);
        setIsSignedIn(false);
      }
    }, intervalMs);

    return () => clearInterval(handle);
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("firebase signOut failed:", err);
    }
    Store.global().firebaseToken = null;
    setUser(null);
    setIsSignedIn(false);
  };

  const getIdToken = async () => {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      return await u.getIdToken();
    } catch (err) {
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
