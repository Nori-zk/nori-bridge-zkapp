"client";

// Local storage fixed keys
export const LS_KEYS = {
  activeDepositNumber: "activeDepositNumber",
  computedEthProof: "computedEthProof",
  depositMintTx: "depositMintTx",
  // isStorageSetup: "isStorageSetup",
} as const;

// Lets define the dynamic keys more rigorously have it as '<concept>:' and then the key information

export const LSKeyPairConceptKeys = ["codeVerifier"] as const;
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


// Local storage key generators

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