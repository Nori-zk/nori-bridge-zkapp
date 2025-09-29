"use client";

import { doc, collection, serverTimestamp, setDoc } from "firebase/firestore";
import { db, auth } from "@/config/firebaseConfig.ts";

export async function firebaseMintFunction(
  amount: number,
  blockNumber: number,
  codeChallenge: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error("No user signed in");

  const userRef = doc(db, "users", user.uid);

  // Auto-ID for deposit document
  const userDepositRef = doc(collection(userRef, "deposits"));

  await setDoc(userDepositRef, {
    amount,
    blockNumber,
    codeChallenge,
    timestamp: serverTimestamp(),
  });

  console.log("Deposit created successfully with codeChallenge");
}
