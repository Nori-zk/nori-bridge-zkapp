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
import { useAccount, useConnect, useConnectors, useDisconnect } from "wagmina";

interface AuroWalletContextType {
  walletAddress: string | null;
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

const devnet_network_id = "mina:devnet";
const devnet_short_id = "devnet"; // Handle wagmina's possible short ID

export const AuroWalletProvider = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWalletOpen, setIsConnectingWalletOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const lastDisconnectRef = useRef<number>(0); // Timestamp for debouncing disconnect

  const { networkId, chain } = useAccount();
  const { connectAsync: wagminaConnectAsync } = useConnect();
  const { disconnectAsync: wagminaDisconnectAsync } = useDisconnect();

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
    description: "Auro Wallet is not installed",
    button: {
      label: "Install",
      onClick: () => openExternalLink("https://www.aurowallet.com/"),
    },
  });
  const toast = useRef(rawToast);

  const connect = useCallback(async () => {
    try {
      if (!walletConnector || !window.mina) {
        toast.current({});
        return;
      }

      console.log("Checking network before connect...");
      const network = await window.mina.requestNetwork().catch((err: any) => {
        console.error("requestNetwork error:", err);
        return err;
      });
      const currentNetworkId = network?.networkID;
      console.log("Current networkID:", currentNetworkId);

      if (
        network instanceof Error ||
        (currentNetworkId !== devnet_network_id &&
          currentNetworkId !== devnet_short_id)
      ) {
        toast.current({
          type: "error",
          title: "Wrong Network",
          description: `Please ensure you are on the Devnet network`,
        });
        // Optional: Auto-switch to Devnet
        try {
          console.log("Attempting to switch to Devnet...");
          await window.mina.switchChain({ networkID: devnet_network_id });
          toast.current({
            type: "notification",
            title: "Network Switch Requested",
            description: `Please confirm the switch to Devnet in Auro Wallet.`,
          });
          return;
        } catch (error) {
          console.error("Failed to switch network:", error);
          return;
        }
      }

      setIsConnectingWalletOpen(true);
      try {
        console.log("Connecting to wallet...");
        const result = await wagminaConnectAsync({
          connector: walletConnector,
        });
        const address = result?.accounts?.[0];
        if (address) {
          setWalletAddress(address);
          setIsConnected(true);
          console.log("Wallet connected successfully, address:", address);
          toast.current({
            type: "notification",
            title: "Success",
            description: "Wallet connected successfully!",
          });
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        toast.current({
          type: "error",
          title: "Connection Failed",
          description: "Failed to connect to Auro Wallet.",
        });
      } finally {
        setIsConnectingWalletOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error during connect:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to connect wallet.",
      });
    }
  }, [wagminaConnectAsync, walletConnector]);

  const disconnect = useCallback(async () => {
    const now = Date.now();
    if (now - lastDisconnectRef.current < 1000) {
      console.log("Disconnect skipped (debounced)");
      return; // Prevent duplicate disconnect within 1 second
    }
    lastDisconnectRef.current = now;

    try {
      console.log("Disconnecting wallet...");
      await wagminaDisconnectAsync();
      setWalletAddress(null);
      setIsConnected(false);
      toast.current({
        type: "notification",
        title: "Disconnected",
        description: "Wallet disconnected successfully.",
      });
    } catch (error) {
      console.warn("Failed to disconnect wallet:", error);
    }
  }, [wagminaDisconnectAsync]);

  // Monitor chain changes via Auro Wallet's event listener (primary source for network changes)
  useEffect(() => {
    if (!window.mina) return;

    const handleChainChange = (chainInfo: { networkID: string }) => {
      console.log("chainChanged event fired:", chainInfo);
      if (
        chainInfo.networkID !== devnet_network_id &&
        chainInfo.networkID !== devnet_short_id
      ) {
        console.log("Non-Devnet network detected, disconnecting...");
        toast.current({
          type: "error",
          title: "Network Changed",
          description: `Please ensure you are on the Devnet network`,
        });

        disconnect();
      }
    };

    window.mina.on("chainChanged", handleChainChange);
    console.log("chainChanged listener attached");

    return () => {
      window.mina?.removeListener?.("chainChanged", handleChainChange);
      console.log("chainChanged listener removed");
    };
  }, [disconnect]);

  // Check initial connection state
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.mina || !walletConnector) return;

      try {
        const network = await window.mina.requestNetwork();
        const accounts = await window.mina.getAccounts();
        console.log("Initial check - network:", network, "accounts:", accounts);
        if (
          accounts.length > 0 &&
          (network.networkID === devnet_network_id ||
            network.networkID === devnet_short_id)
        ) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking initial connection:", error);
      }
    };

    checkConnection();
  }, [walletConnector]);

  const value = useMemo(
    () => ({
      walletAddress,
      isConnectingWalletOpen,
      isConnected,
      setIsConnectingWalletOpen,
      connect,
      disconnect,
    }),
    [walletAddress, isConnectingWalletOpen, isConnected, connect, disconnect]
  );

  return (
    <AuroWalletContext.Provider value={value}>
      {children}
    </AuroWalletContext.Provider>
  );
};
