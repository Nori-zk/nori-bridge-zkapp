"use client";

import { doc, collection, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/config/firebaseConfig.ts";

export async function firebaseMintFunction(
  amount: number,
  blockNumber: number,
  codeChallenge: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error("No user signed in");

  const userRef = doc(db, "users", user.uid);

  // Fetch current role from the user's document
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error("User document not found");

  const roleId = userDoc.data()?.role;
  if (!roleId) throw new Error("User has no role assigned");

  // Auto-ID for deposit document
  const userDepositRef = doc(collection(userRef, "deposits"));

  await setDoc(userDepositRef, {
    amount,
    blockNumber,
    codeChallenge,
    roleId,                // automatically uses current role
    timestamp: serverTimestamp(),
  });

  console.log("Deposit created successfully with codeChallenge and roleId");
}