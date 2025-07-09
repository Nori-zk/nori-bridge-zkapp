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
    if (!zkappWorkerClient || isWorkerLoading) {
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
        message: hashedMessage,
        publicKey: address,
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
    console.log("State changed:", state.value, state.context);
  }, [state]);

  // Show toast on success or error from state machine
  if (isSuccess) {
    toast.current({
      type: "notification",
      title: "Success",
      description: "Credential created successfully!",
    });
  } else if (isError) {
    toast.current({
      type: "error",
      title: "Error",
      description: state.context.errorMessage || "Failed to create credential.",
    });
  }

  return (
    <div className="flex align-center items-center justify-center mt-6 w-full text-white px-4 py-3">
      {isWorkerLoading ? (
        "Spinning up zkappWorker..."
      ) : !zkappWorkerClient ? (
        "zkappWorker is not ready."
      ) : (
        <>
          <button
            className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
            onClick={handleCreateCredential}
            disabled={isLoading || !ethConnected || !minaConnected}
          >
            {isLoading ? "Processing..." : "Create Credential"}
          </button>
          {isSuccess && state.context.credential && (
            <p className="mt-4 text-white">
              Credential: {state.context.credential}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CreateCredentials;
