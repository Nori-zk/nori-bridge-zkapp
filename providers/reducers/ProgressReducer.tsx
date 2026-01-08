import { ProgressState, ProgressAction } from "@/types/types.ts";

export const initialState: ProgressState = {
  currentStep: "lock_tokens",
  completedSteps: [],
};

export const progressReducer = (
  state: ProgressState,
  action: ProgressAction
): ProgressState => {
  switch (action.type) {
    case "NEXT_STEP":
      return {
        ...state,
        currentStep: action.payload.nextStep,
        completedSteps: [...state.completedSteps, state.currentStep],
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};
