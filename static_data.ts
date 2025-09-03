import { ProgressTrackerStepProps } from "@/components/ui/ProgressTracker/ProgressTrackerStep/ProgressTrackerStep.tsx";

//progress steps
export const progressSteps = [
  {
    title: "Accounts Linked",
    isActive: false,
    isCompleted: true,
  },
  {
    title: "Mint wETH",
    isActive: true,
    isCompleted: false,
  },
  {
    title: "Claim wETH",
    isActive: false,
    isCompleted: false,
  },
] as ProgressTrackerStepProps[];
