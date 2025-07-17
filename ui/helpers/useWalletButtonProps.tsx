import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { WalletButtonTypes } from "@/types/types.ts";
import Mina from "@/public/assets/Mina.svg";
import Ethereum from "@/public/assets/Ethereum.svg";
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmina";
import { formatDisplayAddress } from "./walletHelper.tsx";
import { useMemo, useState } from "react";

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
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const { connectAsync: wagminaConnectAsync } = useConnect();
  const connectors = useConnectors();
  const walletConnector = useMemo(() => {
    const walletId =
      process.env.NEXT_PUBLIC_WALLET === "auro"
        ? "com.aurowallet"
        : "co.pallad";
    return connectors.find((c) => c.id === walletId);
  }, [connectors.length]);
  const [isConnectingWalletOpen, setIsConnectingWalletOpen] = useState(false);

  const isEthereum = type === "Ethereum";

  const handleConnect = async () => {
    if (walletConnector) {
      setIsConnectingWalletOpen(true);
      try {
        await wagminaConnectAsync({
          connector: walletConnector,
        });
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      } finally {
        setIsConnectingWalletOpen(false);
      }
    }
  };

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
      onClick: () => (isConnected ? disconnect() : handleConnect()),
      isConnecting: isConnectingWalletOpen,
    };
  }
}
