import { createContext, useContext, useMemo, useEffect, useState } from "react";
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
  credential: string | null;
  compiledEcdsaCredential: boolean;
}

const BridgingContext = createContext<BridgingContextValue | null>(null);

export const BridgingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [credential, setCredential] = useState<string | null>(null);
  const [compiledEcdsaCredential, setCompiledEcdsaCredential] =
    useState<boolean>(false);

  const { zkappWorkerClient, isLoading: isWorkerLoading } = useZkappWorker();
  const {
    contract,
    walletAddress: ethAddress,
    isConnected: ethConected,
  } = useMetaMaskWallet();
  const { address: minaAddress, isConnected: minaConnected } = useAccount();

  const [state, send] = useMachine(BridgingMachine, {
    input: { zkappWorkerClient },
  });

  //due to requirement needing credential to check for credential in localStorage, moved initialisation Credential
  //to BridgingProvider, so we can check if credential is set in localStorage. Removes potential circular dependency
  useEffect(() => {
    //only continue to initialise if we have a zkappWorkerClient, credential is not set,
    // and both wallets are connected
    const initialiseCredential = async () => {
      try {
        // Perform your follow-up initialisation here

        if (zkappWorkerClient && !credential && ethConected && minaConnected) {
          console.log("initialising credential, nothing in localStorage");
          const result = await zkappWorkerClient.initialiseCredential();
          console.log("Credential initialised, useEffect:", result);
          setCompiledEcdsaCredential(result);
        }
      } catch (err) {
        console.error("Credential initialisation failed:", err);
      }
    };

    initialiseCredential();
  }, [zkappWorkerClient, credential, ethConected, minaConnected]);

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
      setCredential(storedData);
      if (storedData) {
        console.log("Found existing credential in localStorage");
        const {
          credential,
          minaAddress: storedMina,
          ethAddress: storedEth,
        } = JSON.parse(storedData);

        // if (storedMina === minaAddress && storedEth === ethAddress) {
        send({
          type: "UPDATE_MACHINE",
          zkappWorkerClient,
          contract,
          credential,
          step: "lock",
        });
        //   } else {
        //     send({
        //       type: "UPDATE_MACHINE",
        //       zkappWorkerClient,
        //       contract,
        //       credential: null,
        //       step: "create",
        //     });
        //   }
        // } else {
        //   send({
        //     type: "UPDATE_MACHINE",
        //     zkappWorkerClient,
        //     contract,
        //     credential: null,
        //     step: "create",
        //   });
        // }
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
      credential,
      compiledEcdsaCredential,
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
