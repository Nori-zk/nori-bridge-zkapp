import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WalletButtonTypes } from "@/types/types.ts";
import Mina from "@/public/assets/Mina.svg";
import Ethereum from "@/public/assets/Ethereum.svg";
import { formatDisplayAddress } from "./walletHelper.tsx";
import { useAuroWallet } from "@/providers/AuroWalletProvider/AuroWalletProvider.tsx";
import { ReactNode } from "react";

//TODO rename to return type
type WalletButtonUIProps = {
  bgClass: string;
  textClass: string;
  displayAddress: string;
  logo: ReactNode;
  onClick: () => void;
  isConnecting?: boolean;
  currency?: string;
  transactionTitle?: string;
  transactionAmount?: number;
};

export function useWalletButtonProps(
  type: WalletButtonTypes,
  content: string = "Connect Wallet"
): WalletButtonUIProps {
  const eth = useMetaMaskWallet();
  const {
    isConnected,
    isConnectingWalletOpen,
    connect,
    disconnect,
    walletAddress: address,
  } = useAuroWallet();
  const isEthereum = type === "Ethereum";

  if (isEthereum) {
    return {
      bgClass: eth.isConnected ? "bg-connectedGreen" : "bg-white",
      textClass: eth.isConnected ? "text-white" : "text-black",
      displayAddress: eth.isConnected ? eth.displayAddress ?? content : content,
      logo: <Ethereum title="Ethereum logo" className="scale-[0.65]" />,
      onClick: () => (eth.isConnected ? eth.disconnect() : eth.connect()),
      isConnecting: false,
      currency: "ETH",
      transactionTitle: "Locking transaction",
      transactionAmount: 0.0,
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
      currency: "nETH",
      transactionTitle: "Claim transaction",
      transactionAmount: 0.0,
    };
  }
}
