import { ReactNode, useEffect, useRef } from "react";
import LockTokens from "@/components/bridge-control-card/ProgressSteps/LockTokens.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import SetupStorage from "@/components/bridge-control-card/ProgressSteps/SetupStorage.tsx";
import DepositStatus from "@/components/bridge-control-card/ProgressSteps/DepositStatus.tsx";
import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";
import { useToast } from "@/helpers/useToast.tsx";
import Ping from "@/components/ui/Ping/Ping.tsx";
import Completed from "@/components/bridge-control-card/ProgressSteps/Completed.tsx";

type BridgeControlCardProps = {
  title: string;
  component?: ReactNode;
};

export function useBridgeControlCardProps(): BridgeControlCardProps {

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
    case "checkingDelay":
      return {
        title: "Retrying...",
        component: <> </>
      }
    case "completed":
      return {
        title: "Deposit complete",
        component: <Completed />,
      };

    default:
      return {
        title: "Loading",
        component: <></>,
      };
  }

}

export const getContractCompileLabel = (
  mintWorker: ZkappMintWorkerClient | null | undefined
): ReactNode => {
  if (!mintWorker) return <div>{"Loading"}</div>;
  if (mintWorker.isCompilingContracts()) {
    return (<div className="py-4"> <Ping content="Compiling Contracts" /></div>)
  } else {
    return (<div className="py-2"></div>)
  }
};
