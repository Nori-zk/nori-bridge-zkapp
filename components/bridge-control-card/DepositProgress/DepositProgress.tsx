import ProgressBar from "@/components/ui/ProgressBar/ProgressBar.tsx";
import Tooltip from "@/components/ui/Tooltip/Tooltip.tsx";
import {
  ReplacementDepositProcessingStatus,
  ReplacementStageName,
} from "@/machines/actors/statuses.ts";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import LeftLine from "@/public/assets/LeftLine.svg";
import RightLine from "@/public/assets/RightLine.svg";
import { STATUS_EXPLANATIONS } from "@/types/types.ts";
import { useState } from "react";

// Define the order of stages
const STAGE_ORDER = [
  ReplacementStageName.ProvingLightClient,
  ReplacementStageName.VerifyingZkVMProof,
  ReplacementStageName.SettlingProof,
  ReplacementStageName.WaitingForConfirmation,
];

const DepositProgress = () => {
  const {
    depositStatus,
    depositStepElapsedTime = 0,
    depositStepTimeRemaining = 0,
    depositBridgeStageName,
  } = useNoriBridge();

  const [showTooltip, setShowTooltip] = useState<string | boolean>(false);

  // Timing progress
  const stageTotal = depositStepElapsedTime + depositStepTimeRemaining;
  const stageProgress = stageTotal
    ? Math.min(100, (depositStepElapsedTime / stageTotal) * 100)
    : 0;

  // Determine what to show
  const showBridgeStage =
    depositStatus !==
      ReplacementDepositProcessingStatus.WaitingForEthFinality &&
    depositStatus !== ReplacementDepositProcessingStatus.ReadyToMint;
  const hideProgress =
    depositStatus === ReplacementDepositProcessingStatus.ReadyToMint;
  // Get explanation for current status
  const getStatusExplanation = () => {
    return (
      STATUS_EXPLANATIONS[depositStatus!] ||
      "Processing your bridge transaction. Please wait while we handle the technical details."
    );
  };

  // Stage progress logic
  const renderStageProgress = () => {
    if (!depositBridgeStageName || !showBridgeStage) {
      return <div></div>;
    }

    const currentIndex = STAGE_ORDER.indexOf(
      depositBridgeStageName as ReplacementStageName
    );

    // Create array of 3 stages to display: [completed, current, upcoming]
    const getDisplayStages = () => {
      const stages = [];

      if (currentIndex === 0) {
        // First stage: [empty, current, next]
        stages.push(""); // Empty first position
        stages.push(STAGE_ORDER[0]); // Current
        stages.push(STAGE_ORDER[1] || ""); // Next
      } else if (currentIndex === STAGE_ORDER.length - 1) {
        // Last stage: [previous, current, empty]
        stages.push(STAGE_ORDER[currentIndex - 1]); // Previous
        stages.push(STAGE_ORDER[currentIndex]); // Current
        stages.push(""); // Empty last position
      } else if (currentIndex > 0) {
        // Middle stages: [previous, current, next]
        stages.push(STAGE_ORDER[currentIndex - 1]); // Previous
        stages.push(STAGE_ORDER[currentIndex]); // Current
        stages.push(STAGE_ORDER[currentIndex + 1]); // Next
      } else {
        // Fallback: stage not found in order
        stages.push("");
        stages.push(depositBridgeStageName);
        stages.push("");
      }

      return stages;
    };

    const [leftStage, centerStage, rightStage] = getDisplayStages();

    return (
      <div className="flex items-center w-full justify-around px-12">
        {/* Left stage */}
        <div className="text-lightGreen/20 flex-1 text-center">{leftStage}</div>

        {/* Left line - only show if left stage exists */}
        {leftStage && <LeftLine />}

        {/* Center stage (current) */}
        <div className="flex flex-col items-center justify-center flex-1 text-center relative">
          <span className="text-lightGreen">{centerStage}</span>

          {/* Help Icon with Tooltip for center stage - positioned below */}
          {centerStage && (
            <div className="relative mt-1">
              <div
                className="w-4 h-4 rounded-full border border-lightGreen/60 flex items-center justify-center cursor-help text-xs text-lightGreen/60 hover:text-lightGreen hover:border-lightGreen transition-colors"
                onMouseEnter={() => setShowTooltip(centerStage)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                ?
              </div>

              {/* Tooltip */}
              {showTooltip === centerStage && (
                <Tooltip
                  content={
                    STATUS_EXPLANATIONS[centerStage] ||
                    "Processing stage in progress."
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* Right line - only show if right stage exists */}
        {rightStage && <RightLine />}

        {/* Right stage */}
        <div className="text-lightGreen/20 flex-1 text-center">
          {rightStage}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="w-full">
        <hr className="border-0 h-0.5 bg-white/20 mt-8" />
        <div className="flex w-full justify-center items-center text-lightGreen py-3 relative">
          <span>{depositStatus}</span>

          {/* Help Icon with Tooltip */}
          {depositStatus && (
            <div className="relative ml-2">
              <div
                className="w-4 h-4 rounded-full border border-lightGreen/60 flex items-center justify-center cursor-help text-xs text-lightGreen/60 hover:text-lightGreen hover:border-lightGreen transition-colors"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                ?
              </div>

              {/* Tooltip */}
              {showTooltip === true && (
                <Tooltip content={getStatusExplanation()} />
              )}
            </div>
          )}
        </div>
        {depositStatus && <hr className="border-0 h-0.5 bg-white/20" />}
        <ProgressBar progress={hideProgress ? 0.0 : stageProgress} />
        {renderStageProgress()}
      </div>
    </div>
  );
};

export default DepositProgress;
