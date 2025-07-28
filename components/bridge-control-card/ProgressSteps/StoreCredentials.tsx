"use client";
import { useRef, useState } from "react";
import { useToast } from "@/helpers/useToast.tsx";
import { useAccount } from "wagmina";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";

const StoreCredentials = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { state, send, isLoading, isSuccess, isError } = useBridging();
  const { connector } = useAccount();

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const handleStoreCredential = async () => {
    setIsProcessing(true);
    try {
      if (!connector || !state.context.credential) {
        throw new Error("No provider or credential available.");
      }
      const provider = await connector.getProvider();
      if (!provider) {
        throw new Error("Failed to get provider.");
      }
      send({
        type: "STORE_CREDENTIAL",
        provider,
        credential: state.context.credential,
      });
    } catch (error) {
      console.error("Error initiating credential storage:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: (error as Error).message || "Failed to store credential.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-6 w-full text-white px-4 py-3">
      <button
        className="mt-6 w-full text-sm text-white rounded-lg px-4 py-3 border-[1.1px] border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        onClick={handleStoreCredential}
        disabled={
          isProcessing || isLoading || !state.context.credential || !connector
        }
      >
        {isProcessing || isLoading ? "Processing..." : "Store Credential"}
      </button>
      {isSuccess && state.context.step === "store" && (
        <p className="mt-4 text-white text-sm">
          Credential stored successfully!
        </p>
      )}
      {isError && state.context.errorMessage && (
        <p className="mt-4 text-red-500 text-sm">
          {state.context.errorMessage}
        </p>
      )}
    </div>
  );
};

export default StoreCredentials;
