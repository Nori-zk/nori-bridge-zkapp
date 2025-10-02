import { useEffect, useState, ReactNode } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import BridgeControlCardSVG from "./BridgeControlCardSVG.tsx";
import { progressSteps } from "@/static_data.ts";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useSetup } from "@/providers/SetupProvider/SetupProvider.tsx";
import Swap from "@/public/assets/Swap.svg";
import DepositProgress from "./DepositProgress/DepositProgress.tsx";
import DecryptedText from "@/blocks/TextAnimations/DecryptedText/DecryptedText.tsx";
import TextType from "@/blocks/TextAnimations/TextType/TextType.tsx";

type BridgeControlCardProps = {
  title: string;
  content?: ReactNode;
  width: string;
  height: string;
};

const BridgeControlCard = ({
  title,
  content,
  width,
  height,
}: BridgeControlCardProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [displayProgressSteps, setDisplayProgressSteps] = useState(false);
  // const [depositNumber, setDepositNumberInput] = useState<string>("12345");

  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { currentState } = useNoriBridge();
  const { bridgeSocketConnectionState$ } = useSetup();

  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "reconnecting" | "permanently-closed"
  >("connecting");

  useEffect(() => {
    setIsMounted(true);
    if (progressSteps.length > 0) {
      setDisplayProgressSteps(true);
    }
  }, []);

  useEffect(() => {
    const sub = bridgeSocketConnectionState$.subscribe(setStatus);
    return () => sub.unsubscribe();
  }, [bridgeSocketConnectionState$]);

  const minaButtonContent = isMounted
    ? minaConnected
      ? formatDisplayAddress(minaAddress ?? "") || "Connect Wallet"
      : "Connect Wallet"
    : "Connect Wallet";

  return (
    <div>
      <div
        style={{
          width: width,
          height: height,
          position: "relative",
          overflow: "hidden",
          boxShadow:
            ethConnected && minaConnected
              ? "-30px 0px 20px -15px lightGreen, 30px 0px 20px -15px LightGreen"
              : "none",
          borderRadius: "20px",
        }}
      >
        <BridgeControlCardSVG width={width} height={height}>
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-center text-white text-4xl mb-6 font-[400]">
              <TextType
                key={title}
                text={title}
                typingSpeed={75}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
              />
            </h1>
            <div className="w-3/4">
              <div className="flex text-white justify-between items-center">
                <WalletButton
                  id="eth-btn"
                  types={"Ethereum"}
                  content={
                    ethConnected ? ethDisplayAddress ?? "" : "Connect Wallet"
                  }
                />
                <div className="flex items-center justify-center w-7 h-7 mx-2">
                  <Swap />
                </div>

                <WalletButton
                  id="mina-btn"
                  types={"Mina"}
                  content={minaButtonContent}
                />
              </div>
              <div className="flex justify-center mt-1 text-white">
                {content}
              </div>
            </div>
            {/* {displayProgressSteps && <ProgressTracker steps={progressSteps} />} */}

            {/* Current State Display */}
            {/* <div className="flex justify-around items-center">
              <div className="p-4">
                <div className={`font-mono text-sm ${getStatusColor()}`}>
                  State: <span className="font-bold">{getStateDisplay()}</span>
                </div>
                {isLoading && (
                  <div className="text-yellow-600 mt-1">⏳ Loading...</div>
                )}
                {isError && (
                  <div className="text-red-600 mt-1">
                    ❌ Error: {state.context.errorMessage}
                  </div>
                )}
                {isReady && <div className="text-green-600 mt-1">✅ Ready</div>}
              </div>
              <div>
                <div className="flex flex-row items-center space-x-2">
                  {/* <label className="block text-sm font-medium mb-1">
                  Deposit Block Number
                </label> */}
            {/* <div className="flex flex-row gap-2">
                  {/* <input
                    type="text"
                    value={depositNumber}
                    onChange={(e) => setDepositNumberInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., 12345"
                  /> */}

            {currentState !== "completed" ? <DepositProgress /> : <></>}
          </div>
        </BridgeControlCardSVG>
      </div>
    </div>
  );
};

export default BridgeControlCard;
