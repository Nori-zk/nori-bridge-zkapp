"use client";

import { motion } from "framer-motion";
import ProgressTrackerStep from "@/components/ui/ProgressTracker/ProgressTrackerStep/ProgressTrackerStep.tsx";
import ProgressTrackerConnector from "@/components/ui/ProgressTracker/ProgressTrackerConnector/ProgressTrackerConnector.tsx";
import { ProgressTrackerStepProps } from "@/components/ui/ProgressTracker/ProgressTrackerStep/ProgressTrackerStep.tsx";

interface ProgressTrackerProps {
  steps: ProgressTrackerStepProps[];
}

const ProgressTracker = ({ steps }: ProgressTrackerProps) => {
  return (
    <div className="flex w-full items-center justify-center m-3">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <ProgressTrackerStep {...step} />
          {index < steps.length - 1 && (
            <ProgressTrackerConnector
              isCompleted={steps[index].isCompleted}
              isNextActive={steps[index + 1].isActive}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressTracker;
