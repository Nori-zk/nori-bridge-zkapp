"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  BrowserProvider,
  Contract,
  ethers,
  Signer,
  BigNumberish,
} from "ethers";
import { useToast } from "@/helpers/useToast.tsx";
import { openExternalLink } from "@/helpers/navigation.tsx";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { noriTokenBridgeJson } from "@nori-zk/ethereum-token-bridge";
import envConfig from "@/helpers/env.ts";

interface SignMessageResult {
  signature: string;
  walletAddress: string;
  message: string;
}

interface MetaMaskWalletContextType {
  walletAddress: string | null;
  displayAddress: string | null;
  isConnected: boolean;
  lockedAmount: string | null;
  contract: Contract | null;
  chainId: string | null;
  isOnCorrectNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<SignMessageResult>;
  bridgeOperator: () => Promise<void>;
  lockTokens: (codeChallange: string, amount: number) => Promise<number>;
  getLockedTokens: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

const MetaMaskWalletContext = createContext<
  MetaMaskWalletContextType | undefined
>(undefined);

export const useMetaMaskWallet = (): MetaMaskWalletContextType => {
  const context = useContext(MetaMaskWalletContext);
  if (!context) {
    throw new Error(
      "useMetaMaskWallet must be used within a MetaMaskWalletProvider"
    );
  }
  return context;
};

const holesky_network_id = "0x4268";

export const MetaMaskWalletProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [lockedAmount, setLockedAmount] = useState<string | null>(null);
  // NEW: Track current chain ID
  const [chainId, setChainId] = useState<string | null>(null);

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "MetaMask is not installed",
    button: {
      label: "Install",
      onClick: () => openExternalLink("https://metamask.io"),
    },
  });
  const toast = useRef(rawToast);

  // Helper to check if we're on the correct network
  const isOnCorrectNetwork = useMemo(() => {
    return chainId === holesky_network_id;
  }, [chainId]);

  const initializeContract = useCallback(async (signer: Signer) => {
    const contractAddress = envConfig.NORI_TOKEN_BRIDGE_ADDRESS;
    return new Contract(contractAddress, noriTokenBridgeJson.abi, signer);
  }, []);

  // Helper function to clear wallet state
  const clearWalletState = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
    setSigner(null);
    setContract(null);
    setLockedAmount(null);
  }, []);

  // Helper function to initialize wallet connection
  const initializeWalletConnection = useCallback(
    async (address: string) => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        setWalletAddress(address);
        setIsConnected(true);
        setSigner(signer);

        const newContract = await initializeContract(signer);
        setContract(newContract);

        return true;
      } catch (error) {
        console.error("Failed to initialize wallet connection:", error);
        clearWalletState();
        return false;
      }
    },
    [initializeContract, clearWalletState]
  );

  // Set up chain change listener (runs once)
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (newChainId: string) => {
      console.log("Chain changed to:", newChainId);
      setChainId(newChainId);
    };

    // Get initial chain ID
    const getInitialChainId = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const initialChainId = "0x" + network.chainId.toString(16);
        setChainId(initialChainId);
      } catch (error) {
        console.error("Failed to get initial chain ID:", error);
      }
    };

    getInitialChainId();
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // React to chain changes - this is where the magic happens
  useEffect(() => {
    const checkChain = async () => {
      if (!chainId) return;

      console.log(
        "Reacting to chain change. ChainId:",
        chainId,
        "IsConnected:",
        isConnected
      );

      if (chainId !== holesky_network_id) {
        // User switched to wrong network
        if (isConnected) {
          toast.current({
            type: "error",
            title: "Wrong Network",
            description:
              "You've switched to an unsupported network. Disconnecting wallet.",
          });

          // Disconnect immediately
          clearWalletState();

          // Try to revoke permissions
          try {
            window.ethereum?.request({
              method: "wallet_revokePermissions",
              params: [{ eth_accounts: {} }],
            });

            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: holesky_network_id }],
            });
          } catch (error) {
            console.warn("Failed to revoke permissions:", error);
          }
        }
      } else {
        // User is on correct network
        if (walletAddress && !isConnected) {
          // Re-initialize connection if we have an address but aren't connected
          console.log("Re-initializing connection on correct network");
          initializeWalletConnection(walletAddress).then((success) => {
            if (success) {
              toast.current({
                type: "notification",
                title: "Network Connected",
                description: "Reconnected to Holesky network successfully!",
              });
            }
          });
        }
      }
    };

    checkChain();
  }, [
    chainId,
    isConnected,
    walletAddress,
    clearWalletState,
    initializeWalletConnection,
  ]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.current();
      return;
    }

    try {
      // First check if we're on the correct network before connecting
      if (!isOnCorrectNetwork) {
        toast.current({
          type: "error",
          title: "Wrong Network",
          description:
            "Please switch to Holesky network before connecting your wallet.",
        });

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: holesky_network_id }],
        });

        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts.length > 0) {
        const success = await initializeWalletConnection(accounts[0]);
        if (success) {
          toast.current({
            type: "notification",
            title: "Success",
            description: "Wallet connected successfully!",
          });
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
  }, [isOnCorrectNetwork, initializeWalletConnection]);

  const disconnect = useCallback(async () => {
    if (!isConnected) return;

    clearWalletState();

    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.warn("Failed to revoke permissions:", error);
    }

    toast.current({
      type: "notification",
      title: "Disconnected",
      description: "Wallet disconnected successfully.",
    });
  }, [isConnected, clearWalletState]);

  const signMessage = useCallback(
    async (message: string): Promise<SignMessageResult> => {
      if (!isConnected || !isOnCorrectNetwork) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Please connect wallet on Holesky network first.",
        });
        throw new Error("Wallet not connected or on wrong network");
      }
      try {
        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, walletAddress!],
        });
        return { signature, walletAddress: walletAddress!, message };
      } catch (error) {
        console.error("Error calling signMessageForEcdsa:", error);
        toast.current({
          type: "error",
          title: "Error",
          description: "Error calling sign message for ECDSA.",
        });
        throw error;
      }
    },
    [isConnected, isOnCorrectNetwork, walletAddress]
  );

  const bridgeOperator = useCallback(async () => {
    if (!contract || !isOnCorrectNetwork) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Please connect wallet on Holesky network first.",
      });
      return;
    }
    try {
      const operator = await contract.bridgeOperator();
      toast.current({
        type: "notification",
        title: "Bridge Operator",
        description: `Bridge Operator: ${operator}`,
      });
    } catch (error) {
      console.error("Error calling bridgeOperator:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Error calling bridge operator.",
      });
    }
  }, [contract, isOnCorrectNetwork]);

  const lockTokens = useCallback(
    async (codeChallange: string, amount: number): Promise<number> => {
      if (!contract || !isOnCorrectNetwork) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Please connect wallet on Holesky network first.",
        });
        throw Error("contract not connected or wrong network");
      }
      try {
        const codeChallengePKARMBigInt = BigInt(codeChallange);
        const credentialAttestationBigNumberIsh: BigNumberish =
          codeChallengePKARMBigInt;
        const tx = await contract.lockTokens(
          credentialAttestationBigNumberIsh,
          {
            value: ethers.parseEther(amount.toString()),
          }
        );
        toast.current({
          type: "notification",
          title: "Success",
          description:
            "Transaction sent successfully - waiting on confirmation!",
        });

        const receipt = await tx.wait();
        console.log("Transaction Receipt:", receipt);
        console.log("Block Number:", receipt.blockNumber);

        toast.current({
          type: "notification",
          title: "Success",
          description: "Tokens locked successfully!",
        });
        return receipt.blockNumber;
      } catch (error) {
        console.error("Error calling lockTokens:", error);
        toast.current({
          type: "error",
          title: "Error",
          description: "Error locking tokens.",
        });
        throw error;
      }
    },
    [contract, isOnCorrectNetwork]
  );

  const getLockedTokens = useCallback(async () => {
    if (!contract || !isOnCorrectNetwork) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Please connect wallet on Holesky network first.",
      });
      return;
    }
    try {
      const fakeAttestationHash = "12345";
      const parsedAmount = parseFloat(fakeAttestationHash);
      const amount = await contract?.lockedTokens(walletAddress, parsedAmount);
      const formattedAmount = ethers.formatEther(amount);
      console.log(`Locked tokens for ${walletAddress}: ${formattedAmount}`);
    } catch (error) {
      console.error("Error calling lockTokens:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Error locking tokens.",
      });
    }
  }, [contract, walletAddress, isOnCorrectNetwork]);

  // Check existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) {
        toast.current();
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);

        if (accounts.length > 0) {
          // We have connected accounts, but only proceed if on correct network
          // The chain change effect will handle reconnection if needed
          const address = accounts[0];

          // If we're already on the correct network, initialize immediately
          if (isOnCorrectNetwork) {
            await initializeWalletConnection(address);
          } else {
            // Just store the address, the chain change effect will handle the rest
            setWalletAddress(address);
          }
        }
      } catch (error) {
        console.error("Error checking existing connection:", error);
      }
    };

    // Only run this after we've determined the initial chain ID
    if (chainId !== null) {
      void checkConnection();
    }
  }, [chainId, isOnCorrectNetwork, initializeWalletConnection]);

  // Handle account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // All accounts disconnected
        clearWalletState();
        toast.current({
          type: "notification",
          title: "Wallet Disconnected",
          description: "All accounts have been disconnected.",
        });
      } else {
        // Account switched
        const newAddress = accounts[0];
        if (newAddress !== walletAddress) {
          if (isOnCorrectNetwork) {
            // Re-initialize with new account if on correct network
            initializeWalletConnection(newAddress).then(() => {
              toast.current({
                type: "notification",
                title: "Account Changed",
                description: `Switched to account: ${formatDisplayAddress(
                  newAddress
                )}`,
              });
            });
          } else {
            // Just update the address, don't connect
            setWalletAddress(newAddress);
            toast.current({
              type: "notification",
              title: "Account Changed",
              description: `Account switched to: ${formatDisplayAddress(
                newAddress
              )}. Please switch to Holesky network to connect.`,
            });
          }
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [
    walletAddress,
    isOnCorrectNetwork,
    clearWalletState,
    initializeWalletConnection,
  ]);

  const value = useMemo(
    () => ({
      walletAddress,
      displayAddress: formatDisplayAddress(walletAddress),
      isConnected,
      lockedAmount,
      contract,
      chainId,
      isOnCorrectNetwork,
      connect,
      disconnect,
      signMessage,
      bridgeOperator,
      lockTokens,
      getLockedTokens,
    }),
    [
      walletAddress,
      isConnected,
      lockedAmount,
      contract,
      chainId,
      isOnCorrectNetwork,
      connect,
      disconnect,
      signMessage,
      bridgeOperator,
      lockTokens,
      getLockedTokens,
    ]
  );

  return (
    <MetaMaskWalletContext.Provider value={value}>
      {children}
    </MetaMaskWalletContext.Provider>
  );
};
