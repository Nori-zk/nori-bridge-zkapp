import { ReactNode, useEffect, useRef } from "react";
import { ProgressStep, DepositStates } from "@/types/types.ts";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import LockTokens from "@/components/bridge-control-card/ProgressSteps/LockTokens.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import SetupStorage from "@/components/bridge-control-card/ProgressSteps/SetupStorage.tsx";
import DepositStatus from "@/components/bridge-control-card/ProgressSteps/DepositStatus.tsx";
import ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { useToast } from "@/helpers/useToast.tsx";
import Ping from "@/components/ui/Ping/Ping.tsx";

type BridgeControlCardProps = {
  title: string;
  component?: ReactNode;
  //   buttonText: string;
  //   buttonDisabled: boolean;
  //   textInputDisabled: boolean;
  //   textInputVisible: boolean;
};

export function useBridgeControlCardProps(
  currentStep: ProgressStep
): BridgeControlCardProps {
  const { isConnected: ethConnected } = useMetaMaskWallet();
  const { isConnected: minaConnected } = useAccount();
  const { state: bridgeState, currentState } = useNoriBridge();

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  useEffect(() => {
    console.log("current state in provider:", currentState);
  }, [currentState]);

  useEffect(() => {
    console.log("contratcs compiling");
    if (bridgeState.context.mintWorker?.contractsAreCompiled()) {
      console.log("contracts have compiled");
      const timeTaken =
        bridgeState.context.mintWorker.getLastCompileTimeSeconds();
      toast.current({
        type: "notification",
        title: "Success",
        description: `Contracts compiled successfully in ${timeTaken}s`,
      });
    }
  }, [bridgeState.context.mintWorker?.compiled]);

  switch (currentState) {
    case "noActiveDepositNumber":
      return {
        title: "Start locking your ETH",
        component: <LockTokens />,
      };
    case "setupStorageOnChainCheck":
      return {
        title: "Checking user storage on chain",
        component: (
          <SetupStorage
            subtitle={
              bridgeState.context.mintWorker?.isCompilingContracts()
                ? "Compiling contracts"
                : ""
            }
          />
        ),
      };
    case "setupStorage":
      return {
        title: "Setting up storage",
        component: (
          <SetupStorage
            subtitle={
              bridgeState.context.mintWorker?.isCompilingContracts()
                ? "Compiling contracts"
                : "Creating storage setup transaction"
            }
          />
        ),
      };
    case "submitSetupStorageTx":
      return {
        title: "Submitting setup storage transaction",
        component: (
          <SetupStorage
            subtitle={
              bridgeState.context.mintWorker?.isCompilingContracts()
                ? "Compiling contracts"
                : "Creating transaction"
            }
          />
        ),
      };
    case "waitForStorageSetupFinalization":
      return {
        title: "Setting up storage",
        component: (
          <SetupStorage
            subtitle={
              bridgeState.context.mintWorker?.isCompilingContracts()
                ? "Compiling contracts"
                : "Waiting for Mina transaction confirmation"
            }
          />
        ),
      };
    case "monitoringDepositStatus":
      return {
        title: "Monitoring deposit status",
        component: <DepositStatus />,
      };

    case "computeEthProof":
      return {
        title: "Computing deposit proof",
        component:
          <DepositStatus />
      };
    case "hasComputedEthProof":
      return {
        title: "Awaiting smart contract readiness",
        component:
          <DepositStatus />
      };
    case "buildingMintTx":
      return {
        title: "Building mint transaction",
        component:
          <DepositStatus />
      }

    case "submittingMintTx":
      return {
        title: "Submitting mint transaction",
        component:
          <DepositStatus />
      }

    default:
      return {
        title: "Loading",
        component: <></>,
      };
  }

  //  (currentState == "noActiveDepositNumber") {

  // }

  // if (currentState == "monitoringDepositStatus") {
  //   return {
  //     title:
  //       bridgeState.context.processingStatus?.deposit_processing_status.valueOf() ==
  //       "WaitingForEthFinality"
  //         ? "Waiting for ETH finality"
  //         : "Monitoring deposit status",
  //     component: <LockTokens />,
  //   };
  // }

  // // ? bridgeState.context.activeDepositNumber
  // //             ? bridgeState.context.processingStatus?.deposit_processing_status.valueOf() ==
  // //               "WaitingForEthFinality"
  // //               ? "Waiting for ETH finality"
  // //               : "Monitoring deposit status"
  // //             :

  // if (currentStep === "setup_storage") {
  //   return {
  //     title: "Setting up storage",
  //     component: <SetupStorage />,
  //   };
  // }
  // if (currentStep === "monitor_deposit") {
  //   return {
  //     title: "Monitoring deposit status",
  //     component: <DepositStatus />,
  //   };
  // } else {
  //   return {
  //     title: "tiddies",
  //     component: <div>Tiddies Content</div>,
  //   };
  // }
}

export const getContractCompileLabel = (
  mintWorker: ZkappMintWorkerClient | null | undefined
): ReactNode => {
  if (!mintWorker) return <div>{"Loading"}</div>;
  if (mintWorker.isCompilingContracts())
    return <Ping content="Compiling Contracts" />;
};
