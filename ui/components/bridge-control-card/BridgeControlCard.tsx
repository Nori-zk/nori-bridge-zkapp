import { useEffect, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import CreateCredentials from "./ProgressSteps/CreateCredentials.tsx";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import { FaArrowRight } from "react-icons/fa";
import StoreCredentials from "@/components/bridge-control-card/ProgressSteps/StoreCredentials.tsx";

type BridgeControlCardProps = {
  title: string;
  width?: number;
  height?: number;
};

const BridgeControlCard = (props: BridgeControlCardProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { title, width, height } = props;
  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { state } = useBridging();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const minaButtonContent = isMounted
    ? minaConnected
      ? formatDisplayAddress(minaAddress ?? "") || "Connect Wallet"
      : "Connect Wallet"
    : "Connect Wallet";

  return (
    <div
      style={{
        width,
        height,
        boxShadow:
          "-21px 0px 15px -15px lightGreen, 21px 0px 15px -15px LightGreen",
        borderRadius: "20px",
        border: "0.5px solid var(--lightGreen)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, transparent), linear-gradient(180deg, transparent, transparent), linear-gradient(270deg, transparent, transparent), linear-gradient(0deg, transparent, transparent)",
          backgroundSize: "100% 1px, 1px 100%, 100% 1px, 1px 100%",
          backgroundPosition: "0 0, 100% 0, 0 100%, 0 0",
          backgroundRepeat: "no-repeat",
          mask: "radial-gradient(circle at top left, lightGreen 0%, rgba(6, 59, 231, 0.3) 20%, transparent 50%),radial-gradient(circle at top right, rgba(204, 21, 21, 0.8) 0%, rgba(34, 197, 94, 0.3) 20%, transparent 50%),radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.8) 0%, rgba(34, 197, 94, 0.3) 20%, transparent 50%),radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.8) 0%, rgba(34, 197, 94, 0.3) 20%, transparent 50%)",
          maskComposite: "source-over",
          WebkitMaskComposite: "source-over",
          border: "1px solid lightGreen)",
        }}
      ></div>

      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-center text-white text-3xl mb-6">{title}</h1>
        <div className="w-3/4">
          <div className="flex text-white justify-between items-center">
            <WalletButton
              id="eth-btn"
              types={"Ethereum"}
              content={
                ethConnected ? ethDisplayAddress ?? "" : "Connect Wallet"
              }
            />
            <div className="flex items-center justify-center w-7 h-7 text-black bg-white rounded-full mx-2">
              <FaArrowRight />
            </div>
            <WalletButton
              id="mina-btn"
              types={"Mina"}
              content={minaButtonContent}
            />
          </div>
          <div className="flex justify-center mt-6">
            {state.context.step === "create" ? (
              <CreateCredentials />
            ) : (
              <StoreCredentials />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BridgeControlCard;
