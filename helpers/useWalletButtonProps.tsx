import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WalletButtonTypes } from "@/types/types.ts";
import Mina from "@/public/assets/Mina.svg";
import Ethereum from "@/public/assets/Ethereum.svg";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "./walletHelper.tsx";
import { useAuroWallet } from "@/providers/AuroWalletProvider/AuroWalletProvider.tsx";

type WalletButtonUIProps = {
  bgClass: string;
  textClass: string;
  displayAddress: string;
  logo: React.ReactNode;
  onClick: () => void;
  isConnecting?: boolean;
};

export function useWalletButtonProps(
  type: WalletButtonTypes,
  content: string = "Connect Wallet"
): WalletButtonUIProps {
  const eth = useMetaMaskWallet();
  const { address, isConnected } = useAccount();
  const { isConnectingWalletOpen, connect, disconnect } = useAuroWallet();
  const isEthereum = type === "Ethereum";

  if (isEthereum) {
    return {
      bgClass: eth.isConnected ? "bg-connectedGreen" : "bg-white",
      textClass: eth.isConnected ? "text-white" : "text-black",
      displayAddress: eth.isConnected ? eth.displayAddress ?? content : content,
      logo: <Ethereum title="Ethereum logo" className="scale-[0.65]" />,
      onClick: () => (eth.isConnected ? eth.disconnect() : eth.connect()),
      isConnecting: false,
    };
  } else {
    return {
      bgClass: isConnected ? "bg-connectedGreen" : "bg-white",
      textClass: isConnected ? "text-white" : "text-black",
      displayAddress: isConnected
        ? formatDisplayAddress(address ?? "") || content
        : content,
      logo: <Mina title="Mina logo" className="scale-[0.65]" />,
      onClick: () => (isConnected ? disconnect() : connect()),
      isConnecting: isConnectingWalletOpen,
    };
  }
}
