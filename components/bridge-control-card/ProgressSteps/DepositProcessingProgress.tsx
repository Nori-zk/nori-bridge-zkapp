import React from "react";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

const DepositProcessing: React.FC = () => {
  const {
  depositStatus,
  depositStepElapsedTime = 0,
  depositStepTimeRemaining = 0,
  depositBridgeStageName,
} = useNoriBridge();

  // Calculate progress (0-100)
  const progress = (() => {
    const total = depositStepElapsedTime! + (depositStepTimeRemaining ?? 0);
    if (!total) return 0;
    return Math.min(100, (depositStepElapsedTime! / total) * 100);
  })();

  const showBridgeStage =
    depositStatus === "WaitingForCurrentJobCompletion" ||
    depositStatus === "WaitingForPreviousJobCompletion";

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-900 text-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Deposit Processing</h3>

      <div className="mb-2">
        <span className="font-medium">Status:</span>{" "}
        <span>{depositStatus ?? "Unknown"}</span>
      </div>

      {showBridgeStage && depositBridgeStageName && (
        <div className="mb-2">
          <span className="font-medium">Bridge Stage:</span>{" "}
          <span>{depositBridgeStageName}</span>
        </div>
      )}

      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className="bg-green-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-sm mt-1 text-gray-300">
        {depositStepElapsedTime != null &&
          depositStepTimeRemaining != null &&
          `${depositStepElapsedTime}s elapsed / ${depositStepTimeRemaining}s remaining`}
      </div>
    </div>
  );
};

export default DepositProcessing;
