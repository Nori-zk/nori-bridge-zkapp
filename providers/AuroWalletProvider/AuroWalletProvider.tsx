"use client";
import { openExternalLink } from "@/helpers/navigation.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAccount,
  useClient,
  useConnect,
  useConnectors,
  useDisconnect,
} from "wagmina";

interface AurokWalletContextType {
  isConnectingWalletOpen: boolean;
  setIsConnectingWalletOpen: Dispatch<SetStateAction<boolean>>;
  connect: () => void;
  disconnect: () => void;
}

const AuroWalletContext = createContext<AurokWalletContextType | undefined>(
  undefined
);

export const useAuroWallet = (): AurokWalletContextType => {
  const context = useContext(AuroWalletContext);
  if (!context) {
    throw new Error("useAuroWallet must be used within a AuroWalletProvider");
  }
  return context;
};

const devnet_network_id = "devnet";

export const AuroWalletProvider = ({ children }: { children: ReactNode }) => {
  const [isConnectingWalletOpen, setIsConnectingWalletOpen] = useState(false);

  const { networkId, chain } = useAccount();
  const { connectAsync: wagminaConnectAsync } = useConnect();
  const { disconnectAsync: wagminaDisconnectAsync } = useDisconnect();

  // const chain = await window.mina?.requestNetwork();
  // 		setChainType(chain.chainId);

  const connectors = useConnectors();
  const walletConnector = useMemo(() => {
    const walletId =
      process.env.NEXT_PUBLIC_WALLET === "pallad"
        ? "co.pallad"
        : "com.aurowallet";
    return connectors.find((c) => c.id === walletId);
  }, [connectors]);

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "MetaMask is not installed",
    button: {
      label: "Install",
      onClick: () => openExternalLink("https://www.aurowallet.com/"),
    },
  });
  const toast = useRef(rawToast);

  const connect = useCallback(async () => {
    try {
      if (networkId !== devnet_network_id) {
        toast.current({
          type: "error",
          title: "Network Changed",
          description: `Please ensure you are on the Devnet network`,
        });
        return;
      }

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
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to connect wallet.",
      });
    }
  }, [networkId, wagminaConnectAsync, walletConnector]);

  const disconnect = useCallback(async () => {
    try {
      await wagminaDisconnectAsync();
    } catch (error) {
      console.warn("Failed to revoke permissions:", error);
    }
    toast.current({
      type: "notification",
      title: "Disconnected",
      description: "Wallet disconnected successfully.",
    });
  }, [wagminaDisconnectAsync]);

  useEffect(() => {
    console.log("networkId", networkId);
    console.log("chain", chain);
    if (networkId !== devnet_network_id) {
      toast.current({
        type: "error",
        title: "Network Changed",
        description: `Please ensure you are on the Devnet network`,
      });
      return;
    }
  }, [chain, networkId]);

  const value = useMemo(
    () => ({
      isConnectingWalletOpen,
      setIsConnectingWalletOpen,
      connect,
      disconnect,
    }),
    [connect, disconnect, isConnectingWalletOpen]
  );
  return (
    <AuroWalletContext.Provider value={value}>
      {children}
    </AuroWalletContext.Provider>
  );
};
