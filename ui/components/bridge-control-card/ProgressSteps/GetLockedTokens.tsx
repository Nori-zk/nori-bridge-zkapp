import { useToast } from "@/helpers/useToast.tsx";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useRef } from "react";

const GetLockTokens = () => {
  const { state, send, isLoading, isSuccess, isError } = useBridging();
  const rawToast = useToast({
    type: "error",
    title: "Error",
    description: "",
  });
  const toast = useRef(rawToast);

  const handleGetLockedTokens = async () => {
    try {
      send({ type: "GET_LOCKED_TOKENS" });
    } catch (error) {
      console.error("Error getting locked tokens:", error);
      toast.current({
        type: "error",
        title: "Error",
        description: "Failed to get locked tokens.",
      });
    }
  };

  return (
    <div className="mt-6 w-full text-white">
      <button
        className="w-full text-white rounded-lg px-4 py-3 border-white border-[1px]"
        onClick={handleGetLockedTokens}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Get Locked Tokens"}
      </button>
      {isSuccess &&
        state.context.step === "getLockedTokens" &&
        state.context.lockedAmount && (
          <p className="mt-4 text-white text-sm">
            Locked Amount: {state.context.lockedAmount} ETH
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

export default GetLockTokens;
