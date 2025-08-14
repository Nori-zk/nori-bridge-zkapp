import { createContext, useContext, useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import { BridgingMachine } from "@/machines/BridgingMachine.ts";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";
import type ZkappWorkerClient from "@/workers/zkappWorkerClient.ts";
import { Contract } from "ethers";
import { useMetaMaskWallet } from "../MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";

interface BridgingContextValue {
  state: {
    value: string;
    context: {
      zkappWorkerClient: ZkappWorkerClient | null;
      contract: Contract | null;
      credential: string | null;
      errorMessage: string | null;
      step: "create" | "obtain" | "lock" | "getLockedTokens";
      lastInput?: {
        message: string;
        address: string;
        signature: string;
        walletAddress: string;
        provider: any;
      };
      lockedAmount: string | null;
      attestationHash?: string;
    };
  };
  send: (
    event:
      | {
          type: "CREATE_CREDENTIAL";
          message: string;
          address: string;
          signature: string;
          walletAddress: string;
          provider: any;
        }
      | {
          type: "OBTAIN_CREDENTIAL";
          provider: any;
        }
      | { type: "START_LOCK"; amount: number; attestationHash: string }
      | { type: "GET_LOCKED_TOKENS" }
      | { type: "RETRY" }
      | { type: "RESET" }
      | {
          type: "UPDATE_MACHINE";
          zkappWorkerClient: ZkappWorkerClient | null;
          contract: Contract | null;
          credential?: string | null;
          step?: "create" | "obtain" | "lock" | "getLockedTokens";
        }
  ) => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const BridgingContext = createContext<BridgingContextValue | null>(null);

export const BridgingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { zkappWorkerClient, isLoading: isWorkerLoading } = useZkappWorker();
  const { contract, walletAddress: ethAddress } = useMetaMaskWallet();
  const { address: minaAddress } = useAccount();
  const [state, send] = useMachine(BridgingMachine, {
    input: { zkappWorkerClient },
  });

  useEffect(() => {
    console.log(
      "zkappWorkerClient inside BridgingProvider:",
      zkappWorkerClient
    );
    console.log("contract inside BridgingProvider:", contract);
    send({ type: "UPDATE_MACHINE", zkappWorkerClient, contract });
  }, [zkappWorkerClient, contract, send]);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(
        `credential:${ethAddress}:${minaAddress}`
      );
      if (storedData) {
        const {
          credential,
          minaAddress: storedMina,
          ethAddress: storedEth,
        } = JSON.parse(storedData);

        if (storedMina === minaAddress && storedEth === ethAddress) {
          send({
            type: "UPDATE_MACHINE",
            zkappWorkerClient,
            contract,
            credential,
            step: "lock",
          });
        } else {
          send({
            type: "UPDATE_MACHINE",
            zkappWorkerClient,
            contract,
            credential: null,
            step: "create",
          });
        }
      } else {
        send({
          type: "UPDATE_MACHINE",
          zkappWorkerClient,
          contract,
          credential: null,
          step: "create",
        });
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      send({
        type: "UPDATE_MACHINE",
        zkappWorkerClient,
        contract,
        credential: null,
        step: "create",
      });
    }
  }, [zkappWorkerClient, contract, minaAddress, ethAddress, send]);

  useEffect(() => {
    if (
      state.matches("obtained") &&
      state.context.credential &&
      minaAddress &&
      ethAddress
    ) {
      try {
        const data = {
          credential: state.context.credential,
          minaAddress: minaAddress,
          ethAddress: ethAddress,
        };
        localStorage.setItem(
          `credential:${ethAddress}:${minaAddress}`,
          JSON.stringify(data)
        );
      } catch (error) {
        console.error("Error storing in localStorage:", error);
      }
    }
  }, [state.value, state.context.credential, minaAddress, ethAddress]);

  const value = useMemo(
    () => ({
      state,
      send,
      isLoading:
        state.matches("creating") ||
        state.matches("obtaining") ||
        state.matches("locking") ||
        state.matches("gettingLockedTokens") ||
        isWorkerLoading,
      isSuccess:
        state.matches("success") ||
        state.matches("obtained") ||
        state.matches("locked") ||
        state.matches("gotLockedTokens"),
      isError: state.matches("error"),
    }),
    [state, send, isWorkerLoading]
  );

  return (
    <BridgingContext.Provider value={value}>
      {children}
    </BridgingContext.Provider>
  );
};

export const useBridging = () => {
  const context = useContext(BridgingContext);
  if (!context) {
    throw new Error("useBridging must be within a BridgingProvider");
  }
  return context;
};
