"use client";
import TextInput from "@/components/ui/TextInput.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Store } from "@/helpers/localStorage2.ts";

type FormValues = {
  amount: string;
};

const LockTokens = () => {
  const [locking, setLocking] = useState<boolean>(false);
  const [walletCheck, setWalletCheck] = useState<boolean>(false);
  const { lockTokens, signMessage } = useMetaMaskWallet();
  const { state, setDepositNumber } = useNoriBridge();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    try {
      const amount = parseFloat(data.amount);
      setWalletCheck(true);
      if (!isNaN(amount) && amount >= 0.00000001) {
        // THIS IS BUGGY worker might not have spawned before the submit button is clicked
        const worker = state.context.mintWorker;
        if (!worker)
          throw new Error("Worker not ready but called submit anyway");
        await worker.ready();
        const signatureFromUser = await signMessage(
          worker!.fixedValueOrSecret!
        );
        const codeVerify = await worker.getCodeVerifyFromEthSignature(
          signatureFromUser.signature
        );
        Store.forEth(worker.ethWalletPubKeyBase58).codeVerifier = codeVerify;
        const codeChallange = await worker.createCodeChallenge(codeVerify);
        setLocking(true);
        setWalletCheck(false);
        const blockNubmer = await lockTokens(codeChallange, amount);
        setDepositNumber(blockNubmer);
      } else {
        console.error("Invalid amount");
      }
    } catch (error) {
      // setLocking(false);
      // setWalletCheck(false);
      console.error("Error locking tokens:", error);
    } finally {
      setLocking(false);
      setWalletCheck(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`mt-6 w-full ${
          state.context.activeDepositNumber != null
            ? "text-white/20"
            : "text-white"
        } rounded-lg px-4 py-3`}
      >
        <TextInput
          id="amount-input"
          disabled={state.context.activeDepositNumber != null || locking}
          {...register("amount", {
            required: "Amount is required",
            pattern: {
              value: /^(0|[1-9]\d*)(\.\d{1,6})?$/,
              message: "Must be a valid decimal with max 6 d.p.",
            },
            min: {
              value: 0.0001,
              message: "Must be at least 0.0001",
            },
            max: {
              value: 0.1,
              message: "Must be at most 0.1",
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
          disabled={
            locking || !!state.context.mintWorker?.isCompilingContracts()
          }
          type="submit"
          className={`mt-6 w-full text-white rounded-lg px-4 py-3 ${
            locking || !!state.context.mintWorker?.isCompilingContracts()
              ? "border-none"
              : "border-white"
          } border-[1px]`}
        >
          {walletCheck
            ? "Check your wallet"
            : locking
            ? "Locking tokens in progress"
            : "Lock Tokens"}
        </button>
      </form>
    </>
  );
};

export default LockTokens;
