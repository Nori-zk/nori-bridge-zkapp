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

export const dummyTransactions = [
  {
    hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    status: "Pending",
    amount: "1.5 wETH",
    date: "2024-06-01 12:34:56",
  },
  {
    hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    status: "Completed",
    amount: "2.0 wETH",
    date: "2024-05-28 09:21:45",
  },
];
