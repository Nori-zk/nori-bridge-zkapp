"use client";
import TextInput from "@/components/ui/TextInput.tsx";
import { makeKeyPairLSKey } from "@/helpers/localStorage.ts";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useEffect, ReactNode } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  amount: string;
};

const LockTokens = () => {
  const { lockTokens, signMessage } = useMetaMaskWallet();
  const { dispatch } = useProgress();
  const { state, setDepositNumber } = useNoriBridge();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

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
          {"Compiling Contracts..."}
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lightGreen opacity-75"></span>
            <span className="relative inline-flex size-3 rounded-full bg-lightGreen"></span>
          </span>
        </div>
      );
    if (mintWorker.contractsAreCompiled())
      return <div>{"Contracts Compiled"}</div>;
    return <div>{"Lock Tokens"}</div>;
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const amount = parseFloat(data.amount);
      if (!isNaN(amount) && amount >= 0.00000001) {
        // THIS IS BUGGY worker might not have spawned before the submit button is clicked
        const worker = state.context.mintWorker;
        if (!worker)
          throw new Error("Worker not ready but called submit anyway");
        const signatureFromUser = await signMessage(
          worker!.fixedValueOrSecret!
        );
        await worker.ready();
        const codeVerify = await worker.getCodeVerifyFromEthSignature(
          signatureFromUser.signature
        );
        window.localStorage.setItem(
          makeKeyPairLSKey(
            "codeVerifier",
            worker.ethWalletPubKeyBase58,
            worker.minaWalletPubKeyBase58
          ),
          codeVerify
        );
        const codeChallange = await worker.createCodeChallenge(codeVerify);
        const blockNubmer = await lockTokens(codeChallange, amount);
        setDepositNumber(blockNubmer);
      } else {
        console.error("Invalid amount");
      }
    } catch (error) {
      console.error("Error locking tokens:", error);
    }
  };

  useEffect(() => {
    if (state.context.setupStorageTransaction) {
      dispatch({
        type: "NEXT_STEP",
        payload: { nextStep: "setup_storage" },
      });
    }
  }, [state.context.setupStorageTransaction]);

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 w-full text-white rounded-lg px-4 py-3 "
      >
        <TextInput
          id="amount-input"
          {...register("amount", {
            required: "Amount is required",
            pattern: {
              value: /^(0|[1-9]\d*)(\.\d+)?$/,
              message: "Must be a valid number",
            },
            min: {
              value: 0.0001,
              message: "Must be at least 0.0001",
            },

            validate: (value) =>
              parseFloat(value) >= 0.0001 || "Must be at least 0.0001",
          })}
        />
        {errors.amount && (
          <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
        )}
        <button
          // This disabled check is insufficient
          // Should be disabled if metamask is currently waiting for a pending deposit
          // if the contract is compiling
          // if the contract is compiled
          disabled={!!state.context.mintWorker?.isCompilingContracts()}
          type="submit"
          className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
        >
          {getLockTokensButtonLabel(state.context.mintWorker)}
        </button>
      </form>
    </>
  );
};

export default LockTokens;
