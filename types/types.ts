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
