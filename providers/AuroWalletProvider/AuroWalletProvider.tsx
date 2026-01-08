"use client";
import { openExternalLink } from "@/helpers/navigation.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import { chain } from "@/config/index.tsx";
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
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmina";

interface AuroWalletContextType {
  walletAddress: string | undefined;
  isConnectingWalletOpen: boolean;
  isConnected: boolean;
  setIsConnectingWalletOpen: Dispatch<SetStateAction<boolean>>;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuroWalletContext = createContext<AuroWalletContextType | undefined>(
  undefined
);

export const useAuroWallet = (): AuroWalletContextType => {
  const context = useContext(AuroWalletContext);
  if (!context) {
    throw new Error("useAuroWallet must be used within a AuroWalletProvider");
  }
  return context;
};

export const AuroWalletProvider = ({ children }: { children: ReactNode }) => {
  const connectors = useConnectors();
  const { address: walletAddress, isConnected: wagminaConnected, networkId } = useAccount();

  const [isConnectingWalletOpen, setIsConnectingWalletOpen] = useState(false);
  const lastDisconnectRef = useRef<number>(0); // Timestamp for debouncing disconnect

  const { connectAsync: wagminaConnectAsync } = useConnect();
  const { disconnectAsync: wagminaDisconnectAsync } = useDisconnect();

  const walletConnector = useMemo(() => {
    const palladConnector = connectors.find((c) => c.id === "co.pallad");
    return (process.env.NEXT_PUBLIC_WALLET === "pallad" && palladConnector)
        ? palladConnector
        : connectors.find((c) => c.id === "com.aurowallet");
  }, [connectors]);

  const { switchChainAsync, status: switchChainStatus } = useSwitchChain();

  const toast = useToast();

  const connect = useCallback(async (): Promise<void> => {
    if (!walletConnector) {
      toast({
        type: "error",
        title: "Error",
        description: `${process.env.NEXT_PUBLIC_WALLET === "pallad" ? "Pallad Wallet" : "Auro Wallet"} is not installed`,
        button: {
          label: "Install",
          onClick: () => openExternalLink("https://www.aurowallet.com/"),
        },
      });
      return;
    }
    let connectedNetworkId = networkId;

    if (!wagminaConnected) {
      setIsConnectingWalletOpen(true);
      try {
        console.log("Connecting to wallet...");
        const result = await wagminaConnectAsync({
          connector: walletConnector,
          networkId: chain.id,
        });
        const address = result?.accounts?.[0];
        if (typeof result?.networkId === "string") {
          connectedNetworkId = result.networkId
        }
        if (address) {
          console.log("Wallet connected successfully, address:", address);
          toast({
            type: "notification",
            title: "Success",
            description: "Wallet connected successfully!",
          });
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        toast({
          type: "error",
          title: "Connection Failed",
          description: `Failed to connect to ${walletConnector.name}.`,
        });
      } finally {
        setIsConnectingWalletOpen(false);
      }
    }

    if (connectedNetworkId && connectedNetworkId !== chain.id) {
      try {
        console.log("Attempting to switch to Devnet...");
        toast({
          type: "notification",
          title: "Network Switch Requested",
          description: `Please confirm the switch to ${chain.name} in ${walletConnector.name}.`,
        });
        await switchChainAsync({
          networkId: chain.id,
        });
      } catch (error) {
        console.error("Failed to switch network:", error);
        toast({
          type: "error",
          title: "Network Switch Failed",
          description: `Failed to switch network to ${chain.name}.`,
        });
      }
    }
  }, [wagminaConnected, networkId, switchChainAsync, toast, wagminaConnectAsync, walletConnector]);

  const disconnect = useCallback(async (): Promise<void> => {
    const now = Date.now();
    if (now - lastDisconnectRef.current < 1000) {
      console.log("Disconnect skipped (debounced)");
      return; // Prevent duplicate disconnect within 1 second
    }
    lastDisconnectRef.current = now;

    try {
      console.log("Disconnecting wallet...");
      await wagminaDisconnectAsync();
      toast({
        type: "notification",
        title: "Disconnected",
        description: "Wallet disconnected successfully.",
      });
    } catch (error) {
      console.warn("Failed to disconnect wallet:", error);
    }
  }, [toast, wagminaDisconnectAsync]);

  useEffect(() => {
    console.log({
      chainSwitchStatus: switchChainStatus,
    });
    if (networkId && networkId !== chain.id && switchChainStatus !== "pending") {
      console.log(`Non-${chain.name} network detected`);
      toast({
        type: "error",
        title: "Network Changed",
        description: `Please ensure you are on the ${chain.name} network`,
      });
    }
  }, [networkId, toast, switchChainStatus]);

  const value = useMemo(
    () => ({
      walletAddress: networkId === chain.id ? walletAddress : undefined,
      isConnectingWalletOpen,
      isConnected: wagminaConnected && networkId === chain.id,
      setIsConnectingWalletOpen,
      connect,
      disconnect,
    }),
    [networkId, walletAddress, isConnectingWalletOpen, wagminaConnected, connect, disconnect],
  );

  return (
    <AuroWalletContext.Provider value={value}>
      {children}
    </AuroWalletContext.Provider>
  );
};
