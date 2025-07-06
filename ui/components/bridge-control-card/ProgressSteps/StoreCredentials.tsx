"use client";
import { useRef, useState } from "react";
import { useToast } from "@/helpers/useToast.tsx";
import { useAccount } from "wagmina";

const StoreCredentials = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
      const provider = await connector?.getProvider();
      if (provider) {
        // @ts-ignore
        // await provider.request<"mina_storePrivateCredential">({
        //   method: "mina_storePrivateCredential",
        //   params: [JSON.parse(credential)],
        // });
      }
    } catch (error) {
      console.error("Error storing credential:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to store credential. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
      onClick={async () => {
        await handleStoreCredential();
      }}
      disabled={isProcessing}
    >
      {isProcessing ? "Processing..." : "Store Credential"}
    </button>
  );
};

export default StoreCredentials;
