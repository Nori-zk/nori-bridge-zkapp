import { ReactNode } from "react";
import BridgeControlCardSVG from "@/components/bridge-control-card/BridgeControlCardSVG/BridgeControlCardSVG.tsx";
import DepositProgress from "@/components/bridge-control-card/DepositProgress/DepositProgress.tsx";
import TextType from "@/blocks/TextAnimations/TextType/TextType.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import WalletPair from "@/components/ui/WalletPair/WalletPair.tsx";

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
  const { currentState } = useNoriBridge();

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
              <WalletPair />
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
