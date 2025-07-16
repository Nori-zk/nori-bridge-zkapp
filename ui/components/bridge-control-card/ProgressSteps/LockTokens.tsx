"use client";
import TextInput from "@/components/ui/TextInput.tsx";
import { useForm } from "react-hook-form";
import ConversionPrices from "@/components/bridge-control-card/ConversionPrices/ConversionPrices.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import { useRef } from "react";

type FormValues = {
  amount: string;
};

const LockTokens = () => {
  const { state, send, isLoading, isSuccess, isError } = useBridging();
  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    defaultValues: { amount: "0.001" },
  });

  const ethAmount = watch("amount");

  const onSubmit = async (data: FormValues) => {
    try {
      const amount = parseFloat(data.amount);
      if (isNaN(amount) || amount < 0.004) {
        toast.current({
          type: "error",
          title: "Error",
          description: "Amount must be at least 0.004 ETH.",
        });
        return;
      }
      send({
        type: "START_LOCK",
        amount,
      });
    } catch (error) {
      console.error("Error locking tokens:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to initiate token locking.",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-6 w-full text-white rounded-lg px-4 py-3"
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
            value: 0.004,
            message: "Must be at least 0.004",
          },
          validate: (value) =>
            parseFloat(value) >= 0.004 || "Must be at least 0.004",
        })}
        placeholder="Enter ETH amount"
      />
      <ConversionPrices ethAmount={parseFloat(ethAmount) || 0} />
      {errors.amount && (
        <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
      )}
      <button
        type="submit"
        className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Lock Tokens"}
      </button>
      {isSuccess && state.context.step === "getLockedTokens" && (
        <p className="mt-4 text-white text-sm">Tokens locked successfully!</p>
      )}
      {isError && state.context.errorMessage && (
        <p className="mt-4 text-red-500 text-sm">
          {state.context.errorMessage}
        </p>
      )}
    </form>
  );
};

export default LockTokens;
