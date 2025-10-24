import { ReactNode, useEffect, useState } from "react";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import BridgeControlCardSVG from "@/components/bridge-control-card/BridgeControlCardSVG/BridgeControlCardSVG.tsx";
import Swap from "@/public/assets/Swap.svg";
import DepositProgress from "@/components/bridge-control-card/DepositProgress/DepositProgress.tsx";
import TextType from "@/blocks/TextAnimations/TextType/TextType.tsx";
import { useAccount } from "wagmina";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
type BridgeControlCardPContentProps = {
  title: string;
  content?: ReactNode;
  width: string;
  height: string;
};

const BridgeControlCardContent = ({
  width,
  height,
  content,
  title,
}: BridgeControlCardPContentProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { currentState } = useNoriBridge();

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
        width: width,
        height: height,
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        justifyContent: "center",
        display: "flex",
      }}
    >
      <BridgeControlCardSVG>
        <div className="w-full h-full flex justify-center">
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
            <div className="w-full">
              <div className="flex text-white justify-between items-center">
                <WalletButton
                  id="eth-btn"
                  types={"Ethereum"}
                  content={
                    ethConnected ? ethDisplayAddress ?? "" : "Connect Wallet"
                  }
                  width={300}
                  height={70}
                />
                <div className="flex items-center justify-center w-7 h-7 mx-2">
                  <Swap />
                </div>

                <WalletButton
                  id="mina-btn"
                  types={"Mina"}
                  content={minaButtonContent}
                  width={300}
                  height={70}
                />
              </div>
              <div className="flex justify-center mt-1 text-white">
                {content}
              </div>
            </div>
            {currentState !== "completed" ? <DepositProgress /> : <></>}
          </div>
        </div>
      </BridgeControlCardSVG>
    </div>
  );
};

export default BridgeControlCardContent;
