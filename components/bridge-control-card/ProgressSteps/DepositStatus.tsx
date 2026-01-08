"use client";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useEffect, useRef } from "react";
import { useToast } from "@/helpers/useToast.tsx";
import { getContractCompileLabel } from "@/helpers/useBridgeControlCardProps.tsx";

const DepositStatus = () => {
  const { state } = useNoriBridge();

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  useEffect(() => {
    if (state.value == "hasComputedEthProof") {
      toast.current({
        type: "notification",
        title: "Success",
        description: "Deposit proof computed successfully",
      });
    }

    if (state.value == "submittingMintTx") {
      toast.current({
        type: "notification",
        title: "Success",
        description: "Mint transaction computed successfully",
      });
    }

    if (state.value == "completed") {
      // dispatch
    }
  }, [state.value]);

  return <>{getContractCompileLabel(state.context.mintWorker)}</>;
};

export default DepositStatus;
