"use client";
import TextInput from "@/components/ui/TextInput/TextInput.tsx";
import TextButton from "@/components/ui/TextButton/TextButton.tsx";
import Tooltip from "@/components/ui/Tooltip/Tooltip.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Store } from "@/helpers/localStorage2.ts";
import { setCodeChallenge } from "@/helpers/codeChallengeHelper.ts";
import { createPortal } from "react-dom";

type FormValues = {
  amount: string;
};

const LockTokens = () => {
  const [locking, setLocking] = useState<boolean>(false);
  const [walletCheck, setWalletCheck] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [maxLockable, setMaxLockable] = useState<string | null>(null);
  const tooltipTriggerRef = useRef<HTMLDivElement>(null);

  const { lockTokens, signMessage, walletAddress, balance } =
    useMetaMaskWallet();
  const { state, setDepositNumber } = useNoriBridge();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>();
  const amountValue = watch("amount"); //watch as text input inside form
  const HARDCODED_FEE = 0.0005;
  const receiveAmount =
    amountValue && !isNaN(parseFloat(amountValue))
      ? Math.max(0, parseFloat(amountValue) - HARDCODED_FEE).toFixed(8)
      : null;

  const handleMaxClick = () => {
    if (maxLockable) setValue("amount", maxLockable);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTriggerRef.current) {
      const rect = tooltipTriggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
      setShowTooltip(true);
    }
  };

  const handleTooltipMouseLeave = () => {
    setShowTooltip(false);
  };

  // Clear form when wallet address changes
  useEffect(() => {
    setValue("amount", "");
  }, [walletAddress, setValue]);

  // Estimate gas and calculate max lockable amount
  useEffect(() => {
    const estimateGas = async () => {
      if (!balance || !walletAddress || !window.ethereum) {
        setMaxLockable(null);
        return;
      }

      try {
        const provider = new (await import("ethers")).BrowserProvider(
          window.ethereum,
        );

        // Get current gas price
        const feeData = await provider.getFeeData();
        const effectiveGasPrice = feeData.maxFeePerGas || feeData.gasPrice;

        if (!effectiveGasPrice) {
          throw new Error("Unable to fetch gas price");
        }

        // Use a conservative gas limit estimate for lockTokens transaction
        // Typical lockTokens transactions use around 50,000-100,000 gas
        // We'll use 100,000 as a safe upper estimate
        const estimatedGasUnits = 100000n;

        // Calculate total gas cost in wei
        const gasCostWei = estimatedGasUnits * effectiveGasPrice;

        // Convert to ETH
        const gasCostEth = (await import("ethers")).ethers.formatEther(
          gasCostWei,
        );

        // Calculate max lockable: balance - gas
        const balanceNum = parseFloat(balance);
        const gasNum = parseFloat(gasCostEth);
        const maxAmount = Math.max(0, balanceNum - gasNum);

        setMaxLockable(maxAmount.toFixed(8));

        console.log(
          `Gas estimate: ${estimatedGasUnits} units at ${(
            await import("ethers")
          ).ethers.formatUnits(
            effectiveGasPrice,
            "gwei",
          )} gwei = ${gasCostEth} ETH`,
        );
      } catch (error) {
        console.error("Error estimating gas:", error);
        // Fallback: use a conservative 0.001 ETH for gas
        const fallbackGas = "0.001";
        const maxAmount = Math.max(
          0,
          parseFloat(balance) - parseFloat(fallbackGas),
        );
        setMaxLockable(maxAmount.toFixed(8));
      }
    };

    estimateGas();
  }, [balance, walletAddress]);

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
          worker!.fixedValueOrSecret!,
        );
        const codeVerify = await worker.getCodeVerifyFromEthSignature(
          signatureFromUser.signature,
        );
        Store.forEth(worker.ethWalletPubKeyBase58).codeVerifier = codeVerify;
        const codeChallange = await worker.createCodeChallenge(codeVerify);
        setCodeChallenge(walletAddress, codeChallange);
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
        } rounded-lg py-3`}
      >
        <TextInput
          id="amount-input"
          hasValue={!!amountValue && amountValue.length > 0}
          errorMessage={errors.amount?.message}
          disabled={
            state.context.activeDepositNumber != null ||
            locking ||
            !maxLockable ||
            maxLockable === "0.00000000"
          }
          {...register("amount", {
            required: "Amount is required",
            onChange: () => clearErrors("amount"),
            pattern: {
              value: /^(0|[1-9]\d*)(\.\d{1,8})?$/,
              message: "Must be a valid decimal with max 8 d.p.",
            },
            min: {
              value: 0.0001,
              message: "Must be at least 0.0001",
            },
            validate: {
              minimum: (value) =>
                parseFloat(value) >= 0.0001 || "Must be at least 0.0001",
              maximum: (value) =>
                !maxLockable ||
                parseFloat(value) <= parseFloat(maxLockable) ||
                `Cannot exceed max lockable amount of ${maxLockable} ETH`,
            },
          })}
        />
        <div className="text-white/20 flex justify-between mt-1">
          <div className="text-sm">
            {!!amountValue && amountValue.length > 0 && (
              <span className="text-white/40">
                Receive: {receiveAmount} nETH
              </span>
            )}
          </div>
          <div className="text-sm flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-white/60">Max:</span>
              <button
                type="button"
                onClick={handleMaxClick}
                className="text-white/60 hover:text-white cursor-pointer transition-colors"
                disabled={state.context.activeDepositNumber != null || locking}
              >
                {maxLockable
                  ? parseFloat(maxLockable).toFixed(8)
                  : "calculating..."}{" "}
                ETH
              </button>
              <div
                ref={tooltipTriggerRef}
                className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center cursor-help text-xs text-white/60 hover:text-white hover:border-white transition-colors"
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
              >
                ?
              </div>
            </div>
            {!!amountValue && amountValue.length > 0 && (
              <span className="text-white/40">Fee: {HARDCODED_FEE} ETH</span>
            )}
          </div>
        </div>
        {/* Tooltip Portal - rendered at document body level to avoid overflow issues */}
        {showTooltip &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: "translate(-50%, -100%)",
                zIndex: 9999,
                marginBottom: "8px",
              }}
            >
              <Tooltip
                title="Available to Lock"
                content={`Maximum amount to lock is equal wallet balance - estimated fee (estimated fee)`}
              />
            </div>,
            document.body,
          )}

        <TextButton
          // This disabled check is insufficient
          // Should be disabled if metamask is currently waiting for a pending deposit
          // if the contract is compiling
          // if the contract is compiled
          disabled={
            locking || !!state.context.mintWorker?.isCompilingContracts() || !!errors.amount
          }
          type="submit"
          className="mt-6"
        >
          {walletCheck
            ? "Check your wallet"
            : locking
            ? "Locking tokens in progress"
            : "Lock Tokens"}
        </TextButton>
      </form>
    </>
  );
};

export default LockTokens;
