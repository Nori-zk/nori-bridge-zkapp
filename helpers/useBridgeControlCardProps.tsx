import { ReactNode } from "react";
import { ProgressStep } from "@/types/types.ts";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import LockTokens from "@/components/bridge-control-card/ProgressSteps/LockTokens.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

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
  const { state: bridgeState } = useNoriBridge();

  if (currentStep === "lock_tokens") {
    return {
      title:
        ethConnected && minaConnected
          ? bridgeState.context.activeDepositNumber
            ? bridgeState.context.processingStatus?.deposit_processing_status.valueOf() ==
              "WaitingForEthFinality"
              ? "Waiting for ETH finality"
              : "Monitoring deposit status"
            : "Start locking your ETH"
          : "First connect wallets",
      component: ethConnected && minaConnected ? <LockTokens /> : null,
    };
  }
  if (currentStep === "setup_storage") {
    return {
      title: "Setup Storage Title",
      component: <div>Setup Storage Content</div>,
    };
  } else {
    return {
      title: "tiddies",
      component: <div>Tiddies Content</div>,
    };
  }
}
