import ProgressBar from "@/components/ui/ProgressBar/ProgressBar.tsx";
import { ReplacementDepositProcessingStatus, ReplacementStageName } from "@/machines/actors/statuses.ts";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import LeftLine from "@/public/assets/LeftLine.svg";
import RightLine from "@/public/assets/RightLine.svg";
import { useEffect } from "react";

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


  // Timing progress
  const stageTotal = depositStepElapsedTime + depositStepTimeRemaining;
  const stageProgress = stageTotal ? Math.min(100, (depositStepElapsedTime / stageTotal) * 100) : 0;

  // Determine what to show
  const showBridgeStage =
    depositStatus === ReplacementDepositProcessingStatus.WaitingForCurrentJobCompletion ||
    depositStatus === ReplacementDepositProcessingStatus.WaitingForPreviousJobCompletion;

  const showTimingOnly = depositStatus === ReplacementDepositProcessingStatus.WaitingForEthFinality;


  // useEffect(() => {
  //   console.log('deposit stage:', { total: stageTotal, elapsed: depositStepElapsedTime, remaining: depositStepTimeRemaining, progress: stageProgress });

  // }, [stageProgress]);
  // Stage progress logic
  const renderStageProgress = () => {
    if (!depositBridgeStageName || !showBridgeStage) {
      return <div></div>;
    }

    const currentIndex = STAGE_ORDER.indexOf(depositBridgeStageName as ReplacementStageName);

    // Create array of 3 stages to display: [completed, current, upcoming]
    const getDisplayStages = () => {
      const stages = [];

      if (currentIndex === 0) {
        // First stage: [empty, current, next]
        stages.push(''); // Empty first position
        stages.push(STAGE_ORDER[0]); // Current
        stages.push(STAGE_ORDER[1] || ''); // Next
      } else if (currentIndex === STAGE_ORDER.length - 1) {
        // Last stage: [previous, current, empty]
        stages.push(STAGE_ORDER[currentIndex - 1]); // Previous
        stages.push(STAGE_ORDER[currentIndex]); // Current
        stages.push(''); // Empty last position
      } else if (currentIndex > 0) {
        // Middle stages: [previous, current, next]
        stages.push(STAGE_ORDER[currentIndex - 1]); // Previous
        stages.push(STAGE_ORDER[currentIndex]); // Current
        stages.push(STAGE_ORDER[currentIndex + 1]); // Next
      } else {
        // Fallback: stage not found in order
        stages.push('');
        stages.push(depositBridgeStageName);
        stages.push('');
      }

      return stages;
    };

    const [leftStage, centerStage, rightStage] = getDisplayStages();

    return (
      <div className="flex items-center w-full justify-around px-12">
        {/* Left stage */}
        <div className="text-lightGreen/20 flex-1 text-center">
          {leftStage}
        </div>

        {/* Left line - only show if left stage exists */}
        {leftStage && <LeftLine />}

        {/* Center stage (current) */}
        <div className="text-lightGreen flex-1 text-center">
          {centerStage}
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
        <div className="flex w-full justify-center text-lightGreen py-3">
          {depositStatus}
        </div>
        <hr className="border-0 h-0.5 bg-white/20 mx-7" />
        <ProgressBar progress={stageProgress} />
        {renderStageProgress()}
      </div>
    </div>
  );
};

export default DepositProgress;