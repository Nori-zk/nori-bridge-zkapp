import {
  ReplacementDepositProcessingStatus,
  ReplacementStageName,
} from "@/machines/actors/statuses.ts";

export type WalletButtonTypes = "Mina" | "Ethereum";
export type ChooseSideTypes = "red" | "green" | "blue";

export type ProgressStep =
  | "lock_tokens"
  | "get_locked_tokens"
  | "setup_storage"
  | "monitor_deposit"
  | "complete"
  | "pick_your_side";

export interface ProgressState {
  currentStep: ProgressStep;
  completedSteps: ProgressStep[];
}

export type ProgressAction =
  | { type: "NEXT_STEP"; payload: { nextStep: ProgressStep } }
  | { type: "RESET" };

// Define specific state values as literal types
export type DepositStates =
  | "hydrating"
  | "checking"
  | "noActiveDepositNumber"
  | "hasActiveDepositNumber"
  | "needsToCheckSetupStorageOrWaitingForStorageSetupFinalization"
  | "setupStorageOnChainCheck"
  | "setupStorage"
  | "submitSetupStorageTx"
  | "waitForStorageSetupFinalization"
  | "monitoringDepositStatus"
  | "computeEthProof"
  | "hasComputedEthProof"
  | "buildingMintTx"
  | "submittingMintTx"
  | "checkingDelay"
  | "missedOpportunity"
  | "completed";

// Status explanations mapping
export const STATUS_EXPLANATIONS: Record<string, string> = {
  [ReplacementDepositProcessingStatus.WaitingForEthFinality]:
    "For your deposit to be locked in permanently, the Ethereum consensus layer requires two epochs (~14 minutes). During this time, validators attest to and justify the blocks. Once finalised, the block containing your deposit cannot be reverted.",

  [ReplacementDepositProcessingStatus.WaitingForPreviousJobCompletion]:
    "Nori's infrastructure is still proving the last Ethereum state transition with a batch of deposits. Your deposit has not yet been included in that batch.",
  [ReplacementDepositProcessingStatus.WaitingForCurrentJobCompletion]:
    "Nori's infrastructure is actively proving the state transition for the batch of deposits that includes yours.",

  [ReplacementDepositProcessingStatus.ReadyToMint]:
    "Nori has finished processing. Your deposit is proven and you can now start minting nETH!",

  [ReplacementStageName.ProvingLightClient]:
    "Nori proves the detected state transition from its Helios light client inside the SP1 zkVM. This requires the Succinct Prover Network to generate and return a proof. On average, this step takes under 3 minutes.",

  [ReplacementStageName.VerifyingZkVMProof]:
    "The zkVM proof is verified using an o1js verification circuit through Nori's Proof-Conversion service. This compute-intensive step typically takes under 5.5 minutes.",

  [ReplacementStageName.SettlingProof]:
    "Nori creates and proves a Mina transaction containing the o1js proof of the Ethereum state transition. This step usually takes under 1.5 minutes.",

  [ReplacementStageName.WaitingForConfirmation]:
    "The Mina transaction has been submitted. Depending on block times, confirmation may take anywhere from ~3 minutes up to ~25 minutes. Recently, ~85% of transactions have confirmed within 9 minutes.",
};

export type PairResult = {
  ethTx: EthTransaction;
  minaTx: MinaTransaction | null;
  state: "pending" | "consumed" | "matched";
};

export type MinaTransaction = {
  date: string;
  minaHash: string;
  nAmount: string;
};

export type EthTransaction = {
  date: string;
  ethHash: string;
  formattedAmount: string;
};
