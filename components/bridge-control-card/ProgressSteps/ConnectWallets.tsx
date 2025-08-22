import TextInput from "@/components/ui/TextInput.tsx";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";

const ConnectWallets = () => {
  const { state, isLoading, isSuccess, isError } = useBridging();

  return (
    <form className="w-full text-white rounded-lg px-4 py-3">
      <TextInput id="amount-input" placeholder="0.00" disabled />
      <button
        type="submit"
        className="mt-6 w-full text-white text-lg rounded-lg px-4 py-3 border-white border-[1px]"
        disabled={true}
      >
        {isLoading ? "Processing..." : "Connect Wallet"}
      </button>
    </form>
  );
};

export default ConnectWallets;
