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
  TransactionResponse,
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

const holesky_chain_id = "0x4268";

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

  const initializeContract = useCallback(async (signer: Signer) => {
    const contractAddress = envConfig.NORI_TOKEN_BRIDGE_ADDRESS; //process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
    return new Contract(contractAddress, noriTokenBridgeJson.abi, signer);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.current();
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      const network = (await provider.getNetwork()).chainId;
      const chainIdHex = "0x" + network.toString(16);

      //on connect attempt if not holesky,return
      if (chainIdHex !== holesky_chain_id) {
        toast.current({
          type: "error",
          title: "Network Changed",
          description: `Please ensure you are on the Holesky network`,
        });
        return;
      }

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        setSigner(signer);

        const newContract = await initializeContract(signer);
        setContract(newContract);
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
        title: "Error",
        description: "Failed to connect wallet.",
      });
    }
  }, [initializeContract, toast]);

  const disconnect = useCallback(async () => {
    if (!isConnected) return;

    setWalletAddress(null);
    setIsConnected(false);
    setSigner(null);
    setContract(null);

    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (err) {
      console.warn("Failed to revoke permissions:", err);
    }

    toast.current({
      type: "notification",
      title: "Disconnected",
      description: "Wallet disconnected successfully.",
    });
  }, [isConnected, toast]);

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
        // const parseHex = (hex: string) => ethers.getBytes(hex);
        // const hashMessage = (msg: string) => parseHex(ethers.id(msg));
        // const hashedMessage = ethers.hexlify(hashMessage(message));
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
    [signer, walletAddress, toast]
  );

  const bridgeOperator = useCallback(async () => {
    if (!contract) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Please connect wallet first.",
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
  }, [contract, toast]);

  const lockTokens = useCallback(
    async (codeChallange: string, amount: number): Promise<number> => {
      if (!contract) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Please connect wallet first.",
        });
        throw Error("contract not connected");
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

        //show toast for transaction pending
        const receipt = await tx.wait();
        console.log("Transaction Receipt:", receipt);
        console.log("Block Number:", receipt.blockNumber);
        // toast to have link to etherscan
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
    [contract, toast]
  );

  const getLockedTokens = useCallback(async () => {
    if (!contract) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Please connect wallet first.",
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
  }, [contract, toast]);

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) {
        toast.current();
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        setSigner(signer);
        const newContract = await initializeContract(signer);
        setContract(newContract);
      }
    };

    void checkConnection();
  }, [initializeContract, toast]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        if (accounts[0] !== walletAddress) {
          setWalletAddress(accounts[0]);
          toast.current({
            type: "notification",
            title: "Account Changed",
            description: `Switched to account: ${formatDisplayAddress(
              accounts[0]
            )}`,
          });
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [walletAddress, disconnect, toast]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = async (chainId: string) => {
      if (chainId !== holesky_chain_id) {
        toast.current({
          type: "error",
          title: "Network Changed",
          description: `Please ensure you are on the Holesky network`,
        });

        disconnect();
      } else {
        toast.current({
          type: "notification",
          title: "Network Changed",
          description: `Switched to Holesky network`,
        });
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [connect, disconnect, toast]);

  const value = useMemo(
    () => ({
      walletAddress,
      displayAddress: formatDisplayAddress(walletAddress),
      isConnected,
      lockedAmount,
      contract,
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
