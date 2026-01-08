"use client";
import { Store } from "@/helpers/localStorage2.ts";
import getWorkerClient from "@/singletons/workerSingleton.ts";

export async function getCodeChallenge(
  ethWalletAddress: string | null,
  minaWalletAddress?: string | null
): Promise<string | null> {
  if (!ethWalletAddress) {
    console.error("Cannot get codeChallenge: no ETH wallet address provided");
    return null;
  }

  const normalizedEthAddress = ethWalletAddress.toLowerCase();

  // Check localStorage first (single source of truth)
  const cachedCodeChallenge = Store.forEth(normalizedEthAddress).codeChallenge;
  if (cachedCodeChallenge) {
    return cachedCodeChallenge;
  }

  // If not cached, try to compute from codeVerifier
  const codeVerifier = Store.forEth(normalizedEthAddress).codeVerifier;
  if (!codeVerifier) {
    console.error(
      "Cannot compute codeChallenge: no codeVerifier found in localStorage"
    );
    return null;
  }

  // Compute codeChallenge using the worker
  try {
    const worker = getWorkerClient();

    if (!worker) {
      console.warn("Cannot compute codeChallenge: worker not available");
      return null;
    }

    // Ensure worker is ready
    await worker.ready();

    // Set mina wallet if provided
    if (minaWalletAddress) {
      worker.setWallets({ minaPubKeyBase58: minaWalletAddress });
    }

    // Compute codeChallenge from codeVerifier
    const computedCodeChallenge = await worker.createCodeChallenge(
      codeVerifier
    );

    // Store in localStorage for future use
    Store.forEth(normalizedEthAddress).codeChallenge = computedCodeChallenge;

    return computedCodeChallenge;
  } catch (error) {
    console.error("Error computing codeChallenge:", error);
    return null;
  }
}

export function setCodeChallenge(
  ethWalletAddress: string | null,
  codeChallenge: string
): void {
  if (!ethWalletAddress) {
    console.log("Cannot set codeChallenge: no ETH wallet address provided");
    return;
  }

  const normalizedEthAddress = ethWalletAddress.toLowerCase();
  Store.forEth(normalizedEthAddress).codeChallenge = codeChallenge;
}

export function clearCodeChallenge(ethWalletAddress: string | null): void {
  if (!ethWalletAddress) {
    return;
  }

  const normalizedEthAddress = ethWalletAddress.toLowerCase();
  Store.forEth(normalizedEthAddress).codeChallenge = null;
}
