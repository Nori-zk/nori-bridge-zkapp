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
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.12 ETH",
    nAmount: "0.1 nETH",
    date: "2024-06-01 12:34:56",
  },
  {
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.17 ETH",
    nAmount: "0.2 nETH",
    date: "2024-06-01 12:34:56",
  },
  {
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.12 ETH",
    nAmount: "0.1 nETH",
    date: "2024-06-01 12:34:56",
  },
  {
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.17 ETH",
    nAmount: "0.2 nETH",
    date: "2024-06-01 12:34:56",
  },
  {
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.12 ETH",
    nAmount: "0.1 nETH",
    date: "2024-06-01 12:34:56",
  },
  {
    ethHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    minaHash: "B62qxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxy",
    amount: "0.17 ETH",
    nAmount: "0.2 nETH",
    date: "2024-06-01 12:34:56",
  },
];
