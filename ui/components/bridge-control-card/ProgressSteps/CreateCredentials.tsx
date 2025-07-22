import { useRef, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useToast } from "@/helpers/useToast.tsx";
import { useAccount } from "wagmina";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

const CreateCredentials = () => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("abc");
  const { zkappWorkerClient, isLoading } = useZkappWorker();

  const {
    isConnected: ethConnected,
    displayAddress: ethDisplayAddress,
    signMessageForEcdsa,
  } = useMetaMaskWallet();
  const { isConnected, address } = useAccount();
  const { dispatch, setCredential } = useProgress();
  const { connector } = useAccount();
  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const handleCreateCredential = async () => {
    if (!zkappWorkerClient || isLoading) {
      console.warn(
        `zkWorker not ready yet. client ${zkappWorkerClient} & isLoading ${isLoading}`
      );
      return;
    }

    setIsProcessing(true);
    try {
      if (connector) {
        const provider = await connector.getProvider();
        // @ts-ignore
        const { result } = await provider.request<'mina_requestPresentation'>({
          method: 'mina_requestPresentation',
          params: [{ presentationRequest: '' }],
        });
        console.log("Request Presentation Result:", result);
      }
      // const { signature, walletAddress, hashedMessage } =
      //   await signMessageForEcdsa(message);
      // const cred = await zkappWorkerClient.createEcdsaCredential(
      //   message,
      //   address ?? "",
      //   signature,
      //   walletAddress
      // );
      setCredential(cred);
      dispatch({
        type: "NEXT_STEP",
        payload: { nextStep: "store_credential" },
      });
      toast.current({
        type: "notification",
        title: "Success",
        description: "Credential created successfully!",
      });
    } catch (error) {
      console.error("Error creating credential:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to create credential. Please try again.",
      });
      setCredential(undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex align-center items-center justify-center mt-6 w-full text-white px-4 py-3">
      {isLoading ? (
        "Spinning up zkappWorker..."
      ) : !zkappWorkerClient ? (
        "zkappWorker is not ready."
      ) : (
        <button
          className="mt-6 w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
          onClick={async () => {
            await handleCreateCredential();
          }}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Create Credential"}
        </button>
      )}
    </div>
  );
};

export default CreateCredentials;
