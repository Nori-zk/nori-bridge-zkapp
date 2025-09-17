
"use client";
import TextInput from "@/components/ui/TextInput.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useEffect } from "react";
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

  const onSubmit = async (data: FormValues) => {
    try {
      const amount = parseFloat(data.amount);
      if (!isNaN(amount) && amount >= 0.00000001) {
        const worker = state.context.mintWorker
        const signatureFromUser = await signMessage(worker!.fixedValueOrSecret!);
        const codeVerify = await worker?.getCodeVerifyFromEthSignature(signatureFromUser.signature)
        window.localStorage.setItem(`codeVerify${worker?.ethWalletPubKeyBase58}-${worker?.minaWalletPubKeyBase58}`, codeVerify!)
        const codeChallange = await worker?.createCodeChallenge(codeVerify!);
        const blockNubmer = await lockTokens(codeChallange!, amount);
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
          disabled={!!state.context.mintWorker?.isCompilingContracts()}
          type="submit"
          className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
        >
          {state.context.mintWorker?.isCompilingContracts() ? 'Compiling Contracts...' : 'Lock Tokens'}
        </button>
      </form>
    </>
  );
};

export default LockTokens;
