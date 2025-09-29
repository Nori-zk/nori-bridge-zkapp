import ProgressBar from "@/components/ui/ProgressBar/ProgressBar.tsx";
import {
  ReplacementDepositProcessingStatus,
  ReplacementStageName,
} from "@/machines/actors/statuses.ts";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import LeftLine from "@/public/assets/LeftLine.svg";
import RightLine from "@/public/assets/RightLine.svg";
import { useState } from "react";

// Define the order of stages
const STAGE_ORDER = [
  ReplacementStageName.ProvingLightClient,
  ReplacementStageName.VerifyingZkVMProof,
  ReplacementStageName.SettlingProof,
  ReplacementStageName.WaitingForConfirmation,
];

// Status explanations mapping
const STATUS_EXPLANATIONS: Record<string, string> = {
  [ReplacementDepositProcessingStatus.WaitingForEthFinality]:
    "For your deposit to be locked in permanently, the Ethereum consensus layer requires two epochs (~14 minutes). During this time, validators attest to and justify the blocks. Once finalised, the block containing your deposit cannot be reverted.",

  [ReplacementDepositProcessingStatus.WaitingForPreviousJobCompletion]:
    "Nori's infrastructure is still proving the last Ethereum state transition with a batch of deposits. Your deposit has not yet been included in that batch.",
  [ReplacementDepositProcessingStatus.WaitingForCurrentJobCompletion]:
    "Nori's infrastructure is actively proving the state transition for the batch of deposits that includes yours.",

  [ReplacementDepositProcessingStatus.ReadyToMint]:
    "Nori has finished processing. Your deposit is proven and you can now start minting nETH!",

  [ReplacementStageName.ProvingLightClient]:
    "Nori proves the detected state transition from its Helios light client inside the SP1 zkVM. This requires the Succinct Prover Network to generate and return a proof.",

  [ReplacementStageName.VerifyingZkVMProof]:
    "The zkVM proof is verified using an o1js verification circuit through Nori's Proof-Conversion service.",

  [ReplacementStageName.SettlingProof]:
    "Nori creates and proves a Mina transaction containing the o1js proof of the Ethereum state transition.",

  [ReplacementStageName.WaitingForConfirmation]:
    "The Mina transaction has been submitted. Depending on block times, confirmation may take anywhere from ~3 minutes up to ~25 minutes. Recently, ~85% of transactions have confirmed within 9 minutes.",
};

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
    depositStatus !== ReplacementDepositProcessingStatus.WaitingForEthFinality &&
    depositStatus !== ReplacementDepositProcessingStatus.ReadyToMint;

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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
                  <div className="bg-darkGreen/95 border border-lightGreen/30 rounded-lg p-3 text-sm text-lightGreen/90 shadow-lg backdrop-blur-sm">
                    <div className="relative">
                      {STATUS_EXPLANATIONS[centerStage] ||
                        "Processing stage in progress."}
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
                    </div>
                  </div>
                </div>
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
    <div className="w-4/5">
      <div className="w-full">
        <hr className="border-0 h-0.5 mx-7 bg-white/20" />
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
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
                  <div className="bg-darkGreen/95 border border-lightGreen/30 rounded-lg p-3 text-sm text-lightGreen/90 shadow-lg backdrop-blur-sm">
                    <div className="relative">
                      {getStatusExplanation()}
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-lightGreen/30"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {depositStatus && <hr className="border-0 h-0.5 bg-white/20 mx-7" />}
        <ProgressBar progress={stageProgress} />
        {renderStageProgress()}
      </div>
    </div>
  );
};

export default DepositProgress;
