import TextType from "@/blocks/TextAnimations/TextType/TextType.tsx";
import BridgeControlCardSVG from "../bridge-control-card/BridgeControlCardSVG.tsx";
import { ReactNode } from "react";

type TransactionCardProps = {
  title: string;
  content?: ReactNode;
  width: string;
  height: string;
};

const TransactionCard = ({
  width,
  height,
  content,
  title,
}: TransactionCardProps) => {
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
        // backgroundColor: "var(--darkGreen)/90",
      }}
    >
      <BridgeControlCardSVG width={width} height={height}>
        <div className="flex justify-center w-full h-full">
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
              {/* <div className="flex text-white justify-between items-center">
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
              </div> */}
              <div className="flex justify-center mt-1 text-white">
                {content}
              </div>
            </div>
            {/* {currentState !== "completed" ? <DepositProgress /> : <></>} */}
          </div>
        </div>
      </BridgeControlCardSVG>
    </div>
  );
};

export default TransactionCard;
