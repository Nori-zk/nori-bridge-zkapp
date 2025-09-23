"use client";
import TextInput from "@/components/ui/TextInput.tsx";
import { makeKeyPairLSKey, makeMinaLSKey } from "@/helpers/localStorage.ts";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useEffect, ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { useToast } from "@/helpers/useToast.tsx";
const DepositStatus = () => {
  const { state } = useNoriBridge();
  const { dispatch } = useProgress();

  //   useEffect(() => {
  //     if (state.value == "monitoringDepositStatus") {
  //       console.log("Are we in this useEffect - 2?");

  //       dispatch({
  //         type: "NEXT_STEP",
  //         payload: { nextStep: "monitor_deposit" },
  //       });
  //     }
  //   }, [state.value]);

  useEffect(() => {
    if (state.value == "hasComputedEthProof") {
      useToast({
        type: "notification",
        title: "Success",
        description: "Deposit proof computed successfully",
      });
    }

    if (state.value == "submittingMintTx") {
      useToast({
        type: "notification",
        title: "Success",
        description: "Mint transaction computed successfully",
      });
    }

    if (state.value == "completed") {
      // dispatch
    }
  }, [state.value]);

  const getLockTokensButtonLabel = (
    mintWorker:
      | {
          isCompilingContracts: () => boolean;
          contractsAreCompiled: () => boolean;
        }
      | null
      | undefined
  ): ReactNode => {
    if (!mintWorker) return <div>{"Lock Tokens"}</div>;
    if (mintWorker.isCompilingContracts())
      return (
        <div className="flex flex-row justify-center items-center gap-2">
          {"Compiling Contracts"}
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lightGreen opacity-75"></span>
            <span className="relative inline-flex size-3 rounded-full bg-lightGreen"></span>
          </span>
        </div>
      );
    if (mintWorker.contractsAreCompiled()) {
      useToast({
        type: "notification",
        title: "Success",
        description: "Contracts compiled successfully!",
      });
    }
    return (
      <div>
        {state.value == "computeEthProof"
          ? "Computing deposit proof"
          : state.value == "buildingMintTx"
          ? "Building mint transaction"
          : "Monitoring Deposit Status"}
      </div>
    );
  };

  return <>{getLockTokensButtonLabel(state.context.mintWorker)}</>;
};

export default DepositStatus;
