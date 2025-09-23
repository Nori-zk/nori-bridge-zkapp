import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useEffect } from "react";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";

const SetupStorage = () => {
  const { state } = useNoriBridge();
  const { dispatch } = useProgress();

  useEffect(() => {
    if (state.value == "monitoringDepositStatus") {
      console.log("Are we in this useEffect - 2?");

      dispatch({
        type: "NEXT_STEP",
        payload: { nextStep: "monitor_deposit" },
      });
    }
  }, [state.value]);

  return (
    //TODO add retry button when user rejects setup transaction
    <div className="flex flex-row justify-center items-center gap-2">
      {state.value == "waitForStorageSetupFinalization"
        ? "Waiting for Mina transaction confirmation"
        : "Checking storage"}
      <span className="relative flex size-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lightGreen opacity-75"></span>
        <span className="relative inline-flex size-3 rounded-full bg-lightGreen"></span>
      </span>
    </div>
  );
};

export default SetupStorage;
