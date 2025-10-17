import { ReactNode } from "react";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import ElectricBorder from "@/blocks/Animations/ElectricBorder/ElectricBorder.jsx";
import BridgeControlCardContent from "./BridgeControlCardContent/BridgeControlCardContent.tsx";

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
  const { currentState, state: bridgeState } = useNoriBridge();

  return (
    <div>
      {currentState == "computeEthProof" ||
      currentState == "buildingMintTx" ||
      bridgeState.context.mintWorker?.isCompilingContracts() ||
      currentState == "setupStorage" ? (
        <ElectricBorder
          color={"var(--lightGreen)"}
          speed={1}
          chaos={0.5}
          thickness={2}
          style={{ borderRadius: 16 }}
          className={""}
        >
          <BridgeControlCardContent
            width={width}
            height={height}
            content={content}
            title={title}
          />
        </ElectricBorder>
      ) : (
        <BridgeControlCardContent
          width={width}
          height={height}
          content={content}
          title={title}
        />
      )}
    </div>
  );
};

export default BridgeControlCard;
