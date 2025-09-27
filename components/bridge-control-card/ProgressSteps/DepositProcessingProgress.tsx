import React from "react";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { ReplacementDepositProcessingStatus } from "@/machines/actors/statuses.ts";

const DepositProcessing: React.FC = () => {
  const {
    depositStatus,
    depositStepElapsedTime = 0,
    depositStepTimeRemaining = 0,
    depositBridgeStageName,
    depositStatusStepIndex = 0,
    depositBridgeStageIndex = 0,
  } = useNoriBridge();

  // ReplacementDepositProcessingStatus.length
  const totalStatusSteps = 4;
  const totalBridgeStages = 4; // fixme

  // Timing progress
  const stageTotal = depositStepElapsedTime + depositStepTimeRemaining;
  const stageProgress = stageTotal ? Math.min(100, (depositStepElapsedTime / stageTotal) * 100) : 0;

  // Determine what to show
  const showBridgeStage =
    depositStatus === ReplacementDepositProcessingStatus.WaitingForCurrentJobCompletion ||
    depositStatus === ReplacementDepositProcessingStatus.WaitingForPreviousJobCompletion;


  const showTimingOnly = depositStatus === ReplacementDepositProcessingStatus.WaitingForEthFinality;

  return (
    <div className="w-full p-4 bg-gray-900 text-white rounded-lg shadow-md space-y-4">
      <h3 className="text-lg font-semibold mb-2">Deposit Processing</h3>

      {/* Step dots for depositStatusStepIndex */}
      <div className="flex justify-center space-x-2 mb-2">
        {Array.from({ length: totalStatusSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${idx <= depositStatusStepIndex ? "bg-blue-500" : "bg-gray-700"
              }`}
          />
        ))}
      </div>

      {/* Current deposit status */}
      <div className="text-center mb-2">
        <span className="font-medium">Status:</span>{" "}
        <span>{depositStatus ?? "Unknown"}</span>
      </div>

      {/* Bridge stage + timing (current/previous job completion) */}
      {showBridgeStage && (
        <>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{
                width: `${((depositBridgeStageIndex + 1) / totalBridgeStages) * 100}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-300">
            Bridge Stage Progress ({depositBridgeStageIndex + 1}/{totalBridgeStages})
          </div>

          {depositBridgeStageName && (
            <div className="text-center text-sm mt-1">
              <span className="font-medium">Bridge Stage:</span>{" "}
              <span>{depositBridgeStageName}</span>
            </div>
          )}

          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mt-2">
            <div
              className="bg-green-700 h-4 rounded-full transition-all duration-300"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-300">
            {depositStepElapsedTime}s elapsed / {depositStepTimeRemaining}s remaining
          </div>
        </>
      )}

      {/* Timing only (WaitingForEthFinality) */}
      {showTimingOnly && (
        <>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mt-2">
            <div
              className="bg-green-700 h-4 rounded-full transition-all duration-300"
              style={{ width: `${stageProgress}%` }}
            />
          </div>
          <div className="text-sm text-gray-300">
            {depositStepElapsedTime}s elapsed / {depositStepTimeRemaining}s remaining
          </div>
        </>
      )}
    </div>
  );
};

export default DepositProcessing;
