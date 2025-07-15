import { useEffect, useRef, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import { useAccount } from "wagmina";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

const CreateCredentials = () => {
  const [message, setMessage] = useState<string>("abc");
  const { zkappWorkerClient, isLoading: isWorkerLoading } = useZkappWorker();
  const { state, send, isLoading, isSuccess, isError } = useBridging();
  const { isConnected: ethConnected, signMessageForEcdsa } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address } = useAccount();

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const handleCreateCredential = async () => {
    if (
      !zkappWorkerClient ||
      isWorkerLoading ||
      !state.context.zkappWorkerClient
    ) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Worker not ready. Please try again.",
      });
      return;
    }

    try {
      if (!ethConnected || !minaConnected || !address) {
        throw new Error("Please connect both Ethereum and Mina wallets.");
      }
      const { signature, walletAddress, hashedMessage } =
        await signMessageForEcdsa(message);
      send({
        type: "CREATE_CREDENTIAL",
        message,
        address,
        signature,
        walletAddress,
      });
    } catch (error) {
      console.error("Error initiating credential creation:", error);
      toast.current({
        type: "error",
        title: "Error",
        description:
          (error as Error).message || "Failed to initiate credential creation.",
      });
    }
  };

  useEffect(() => {
    if (isSuccess && state.context.step === "store") {
      toast.current({
        type: "notification",
        title: "Success",
        description: "Credential created successfully! Ready to store.",
      });
    } else if (isError) {
      toast.current({
        type: "error",
        title: "Error",
        description:
          state.context.errorMessage || "Failed to create credential.",
      });
    }
  }, [state.value, state.context, isSuccess, isError]);

  return (
    <div className="flex flex-col items-center justify-center mt-6 w-full text-white px-4 py-3">
      {isWorkerLoading || !state.context.zkappWorkerClient ? (
        <p>Spinning up zkappWorker...</p>
      ) : !zkappWorkerClient ? (
        <p>zkappWorker is not ready.</p>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 w-full overflow-hidden">
          <button
            className="mt-6 w-full text-sm text-white rounded-lg px-4 py-3 border-[1.1px] border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            onClick={handleCreateCredential}
            disabled={
              isLoading ||
              !ethConnected ||
              !minaConnected ||
              !zkappWorkerClient ||
              isWorkerLoading ||
              !state.context.zkappWorkerClient
            }
          >
            {isLoading ? "Processing..." : "Create Credential"}
          </button>
          {isSuccess &&
            state.context.credential &&
            state.context.step === "store" && (
              <p className="mt-2 text-white text-xs overflow-y-auto max-h-16 break-all w-full p-2 whitespace-pre-wrap">
                Credential: {state.context.credential}
              </p>
            )}
        </div>
      )}
    </div>
  );
};

export default CreateCredentials;
