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
import { Store } from "@/helpers/localStorage2.ts";
import getWorkerClient from "@/singletons/workerSingleton.ts";

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
  codeChallenge: string | null;
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

const REQUIRED_NETWORK_ID = "0xaa36a7"; // 11155111 in hex - sepolia
const REQUIRED_NETWORK_NAME = "Sepolia";

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
  const [chainId, setChainId] = useState<string | null>(null);
  const [codeChallenge, setCodeChallenge] = useState<string | null>(null);

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
    return chainId === REQUIRED_NETWORK_ID;
  }, [chainId]);
  const initializeContract = useCallback(async (signer: Signer) => {
    const contractAddress = envConfig.NORI_TOKEN_BRIDGE_ADDRESS;
    console.log("Initializing contract at:", contractAddress);
    return new Contract(contractAddress, noriTokenBridgeJson.abi, signer);
  }, []);

  const clearWalletState = useCallback(() => {
    setWalletAddress(null);
    setIsConnected(false);
    setSigner(null);
    setContract(null);
    setLockedAmount(null);
    setCodeChallenge(null);
  }, []);

  const validateNetwork = useCallback(async (): Promise<void> => {
    if (!isOnCorrectNetwork) {
      toast.current({
        type: "error",
        title: "Wrong Network",
        description: `Please switch to ${REQUIRED_NETWORK_NAME} network.`,
      });
      clearWalletState();
      throw new Error(`Not on ${REQUIRED_NETWORK_NAME} network`);
    }

    if (!window.ethereum) {
      throw new Error("MetaMask not available");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = "0x" + network.chainId.toString(16);

    if (currentChainId !== REQUIRED_NETWORK_ID) {
      toast.current({
        type: "error",
        title: "Wrong Network",
        description: `Network changed! Please ensure you're on ${REQUIRED_NETWORK_NAME}.`,
      });
      clearWalletState();
      throw new Error(
        `Network validation failed - not on ${REQUIRED_NETWORK_NAME}`
      );
    }

    if (signer?.provider) {
      const signerNetwork = await signer.provider.getNetwork();
      if ("0x" + signerNetwork.chainId.toString(16) !== REQUIRED_NETWORK_ID) {
        toast.current({
          type: "error",
          title: "Wrong Network",
          description: "Signer network mismatch detected!",
        });
        clearWalletState();
        throw new Error("Signer network validation failed");
      }
    }
  }, [isOnCorrectNetwork, signer, clearWalletState]);

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

      if (chainId !== REQUIRED_NETWORK_ID) {
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
              params: [{ chainId: REQUIRED_NETWORK_ID }],
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
                description: `Reconnected to ${REQUIRED_NETWORK_NAME} network successfully!`,
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
          description: `Please switch to ${REQUIRED_NETWORK_NAME} network before connecting your wallet.`,
        });

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: REQUIRED_NETWORK_ID }],
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
      if (!isConnected) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Please connect wallet first.",
        });
        throw new Error("Wallet not connected");
      }

      try {
        await validateNetwork();
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
    [isConnected, walletAddress, validateNetwork]
  );

  const bridgeOperator = useCallback(async () => {
    if (!contract || !isOnCorrectNetwork) {
      toast.current({
        type: "error",
        title: "Error",
        description: `Please connect wallet on ${REQUIRED_NETWORK_NAME} network first.`,
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
      if (!contract) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Please connect wallet first.",
        });
        throw Error("Contract not connected");
      }

      try {
        await validateNetwork();
        setCodeChallenge(codeChallange);
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

        // SECURITY: Verify the receipt is from Sepolia
        if (
          receipt.chainId &&
          "0x" + receipt.chainId.toString(16) !== REQUIRED_NETWORK_ID
        ) {
          toast.current({
            type: "error",
            title: "Transaction Error",
            description: `Transaction was not confirmed on ${REQUIRED_NETWORK_NAME} network!`,
          });
          throw Error("Transaction confirmed on wrong network");
        }

        console.log("Transaction Receipt:", receipt);
        console.log("Block Number:", receipt.blockNumber);
        console.log("Chain ID:", receipt.chainId);

        //assign eth wallet for mina wallet
        const minaWalletPubKey = getWorkerClient().minaWalletPubKeyBase58;
        Store.forMina(minaWalletPubKey).ethWallet = walletAddress;
        Store.forPair(walletAddress!, minaWalletPubKey).txAmount =
          amount.toString();

        toast.current({
          type: "notification",
          title: "Success",
          description: `Tokens locked successfully on ${REQUIRED_NETWORK_NAME}!`,
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
    [contract, walletAddress, validateNetwork]
  );

  const getLockedTokens = useCallback(async () => {
    if (!contract || !isOnCorrectNetwork) {
      toast.current({
        type: "error",
        title: "Error",
        description: `Please connect wallet on ${REQUIRED_NETWORK_NAME} network first.`,
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
        // toast.current({
        //   type: "notification",
        //   title: "Wallet Disconnected",
        //   description: "All accounts have been disconnected.",
        // });
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
              )}. Please switch to ${REQUIRED_NETWORK_NAME} network to connect.`,
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
      codeChallenge,
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
      codeChallenge,
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
