import TextType from "@/blocks/TextAnimations/TextType/TextType.tsx";
import BridgeControlCardSVG from "@/components/bridge-control-card/BridgeControlCardSVG/BridgeControlCardSVG.tsx";
import { ReactNode } from "react";
import TransactionTable from "@/components/transaction-card/TransactionTable/TransactionTable.tsx";
import WalletPair from "@/components/ui/WalletPair/WalletPair.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";

type TransactionCardProps = {
  title: string;
  content?: ReactNode;
  width: string;
  height: string;
};

const TransactionCard = ({ width, height, title }: TransactionCardProps) => {
  const { isConnected: ethConnected } = useMetaMaskWallet();
  const { isConnected: minaConnected } = useAccount();

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
      <BridgeControlCardSVG width={width} height={height}>
        <div className="flex justify-center w-full h-full">
          <div className="flex flex-col items-center h-full w-4/5 pt-12">
            <h1 className="text-center text-white text-4xl mb-8 font-[400]">
              <TextType
                key={title}
                text={title}
                typingSpeed={75}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
              />
            </h1>
            <WalletPair
              isTransactionCard={true}
              ethBtnFooterNumericContent={0.002}
              minaBtnFooterNumericContent={0.00045}
            />
            <div className="w-full flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-center mt-1 text-white h-full w-full">
                {minaConnected && ethConnected ? (
                  <TransactionTable />
                ) : (
                  <div className="flex h-full m-12">
                    Please connect both wallets for transaction history
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </BridgeControlCardSVG>
    </div>
  );
};

export default TransactionCard;
