"use client";

// Convert former fixed keys to key-pair concept keys
export const LSKeyPairConceptKeys = [
  "codeVerifier",
  "activeDepositNumber",
  "computedEthProof",
  "depositMintTx"
] as const;
export type LSKeyPairConceptKeys = (typeof LSKeyPairConceptKeys)[number];

export function makeKeyPairLSKey(
  concept: LSKeyPairConceptKeys,
  ethWalletPubKeyBase58: string,
  minaWalletPubKeyBase58: string
) {
  return `${concept}:${ethWalletPubKeyBase58}-${minaWalletPubKeyBase58}`;
}

export const LSMinaConceptKeys = ["needsToSetupStorage", "setupStorageInProgress"] as const;
export type LSMinaConceptKeys = (typeof LSMinaConceptKeys)[number];

export function makeMinaLSKey(
  concept: LSMinaConceptKeys,
  minaWalletPubKeyBase58: string
) {
  return `${concept}:${minaWalletPubKeyBase58}`;
}

// Helper functions to get/set key-pair specific values
export function getKeyPairValue(
  concept: LSKeyPairConceptKeys,
  ethWalletPubKeyBase58: string,
  minaWalletPubKeyBase58: string
): string | null {
  const key = makeKeyPairLSKey(concept, ethWalletPubKeyBase58, minaWalletPubKeyBase58);
  return localStorage.getItem(key);
}

export function setKeyPairValue(
  concept: LSKeyPairConceptKeys,
  ethWalletPubKeyBase58: string,
  minaWalletPubKeyBase58: string,
  value: string
): void {
  const key = makeKeyPairLSKey(concept, ethWalletPubKeyBase58, minaWalletPubKeyBase58);
  localStorage.setItem(key, value);
}

export function removeKeyPairValue(
  concept: LSKeyPairConceptKeys,
  ethWalletPubKeyBase58: string,
  minaWalletPubKeyBase58: string
): void {
  const key = makeKeyPairLSKey(concept, ethWalletPubKeyBase58, minaWalletPubKeyBase58);
  localStorage.removeItem(key);
}

// Util to reset the storage but keep the codeVerifier and needsToSetupStorage dynamic keys
export const resetLocalStorage = () => {
  console.log("Resetting machine and clearing localStorage on complete");
  // Exact keys we always want to keep
  const keepKeys: string[] = [];

  // Key-matching functions we always want to keep
  const keepFilters = [
    // Key-pair LS keys
    (key: string) =>
      LSKeyPairConceptKeys.some((concept) => key.startsWith(`${concept}:`)),

    // Mina LS keys
    (key: string) =>
      LSMinaConceptKeys.some((concept) => key.startsWith(`${concept}:`)),
  ];

  Object.keys(localStorage).forEach((key) => {
    const inKeepKeys = keepKeys.includes(key);
    const matchesFilter = keepFilters.some((fn) => fn(key));

    if (!inKeepKeys && !matchesFilter) {
      localStorage.removeItem(key);
    }
  });
};

// Local storage key generators and checkers

export function storageIsSetupAndFinalizedForCurrentMinaKey(minaSenderPublicKeyBase58?: string) {
  if (!minaSenderPublicKeyBase58) throw new Error(`MinaSenderPublicKeyBase58 should have be defined by now`);
  const needsToSetupStorage = localStorage.getItem(makeMinaLSKey('needsToSetupStorage', minaSenderPublicKeyBase58)); // This key is either set to false or absent (will return null therefore)
  return needsToSetupStorage === "false"; // If we are specifically told by localStorage that for this mina key we have setup storage then we dont need to again and can skip
}

export function isSetupStorageInProgressForMinaKey(minaSenderPublicKeyBase58?: string): boolean {
  if (!minaSenderPublicKeyBase58) throw new Error(`MinaSenderPublicKeyBase58 should have been defined by now`);
  const key = makeMinaLSKey('setupStorageInProgress', minaSenderPublicKeyBase58);
  const setupStorageInProgress = localStorage.getItem(key);
  return setupStorageInProgress === "true";
}

// Convenience functions for specific key-pair concepts
export function getActiveDepositNumber(ethWallet: string, minaWallet: string): string | null {
  return getKeyPairValue("activeDepositNumber", ethWallet, minaWallet);
}

export function setActiveDepositNumber(ethWallet: string, minaWallet: string, value: string): void {
  setKeyPairValue("activeDepositNumber", ethWallet, minaWallet, value);
}

export function getComputedEthProof(ethWallet: string, minaWallet: string): string | null {
  return getKeyPairValue("computedEthProof", ethWallet, minaWallet);
}

export function setComputedEthProof(ethWallet: string, minaWallet: string, value: string): void {
  setKeyPairValue("computedEthProof", ethWallet, minaWallet, value);
}

export function getDepositMintTx(ethWallet: string, minaWallet: string): string | null {
  return getKeyPairValue("depositMintTx", ethWallet, minaWallet);
}

export function setDepositMintTx(ethWallet: string, minaWallet: string, value: string): void {
  setKeyPairValue("depositMintTx", ethWallet, minaWallet, value);
}

export function getCodeVerifier(ethWallet: string, minaWallet: string): string | null {
  return getKeyPairValue("codeVerifier", ethWallet, minaWallet);
}

export function setCodeVerifier(ethWallet: string, minaWallet: string, value: string): void {
  setKeyPairValue("codeVerifier", ethWallet, minaWallet, value);
}