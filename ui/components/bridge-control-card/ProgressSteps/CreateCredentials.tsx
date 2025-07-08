import { useEffect, useRef, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import { useAccount } from "wagmina";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

const CreateCredentials = () => {
  const [message, setMessage] = useState<string>("abc");
  const { zkappWorkerClient, isLoading } = useZkappWorker();
  const { state, send } = useBridging();
  const {
    isConnected: ethConnected,
    displayAddress: ethDisplayAddress,
    signMessageForEcdsa,
  } = useMetaMaskWallet();
  const { isConnected, address } = useAccount();

  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const handleCreateCredential = async () => {
    if (!zkappWorkerClient || isLoading) {
      toast.current({
        type: "error",
        title: "Error",
        description: "Worker not ready. Please try again.",
      });
      return;
    }

    try {
      const { signature, walletAddress, hashedMessage } =
        await signMessageForEcdsa(message);
      send({
        type: "START",
      });
      console.log(state.context.userData);
    } catch (error) {
      console.error("Error initiating credential creation:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to initiate credential creation.",
      });
    }
  };

  useEffect(() => {
    console.log("State changed:", state.value, state.context);
  }, [state]);

  // Show toast on success or error from state machine
  if (state.value === "success") {
    toast.current({
      type: "notification",
      title: "Success",
      description: "Credential created successfully!",
    });
  } else if (state.value === "error") {
    toast.current({
      type: "error",
      title: "Error",
      description: state.context.errorMessage || "Failed to create credential.",
    });
  }

  return (
    <div className="flex align-center items-center justify-center mt-6 w-full text-white px-4 py-3">
      {isLoading ? (
        "Spinning up zkappWorker..."
      ) : !zkappWorkerClient ? (
        "zkappWorker is not ready."
      ) : (
        <>
          <button
            className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
            onClick={handleCreateCredential}
            disabled={
              state.value === "creating" || !ethConnected || !isConnected
            }
          >
            {state.value === "creating" ? "Processing..." : "Create Credential"}
          </button>
          {state.value === "success" && (
            <p className="mt-4 text-white">Credential:</p>
          )}
        </>
      )}
    </div>
  );
};

export default CreateCredentials;
