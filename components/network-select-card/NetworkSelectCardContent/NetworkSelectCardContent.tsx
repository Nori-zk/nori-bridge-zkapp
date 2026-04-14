import NetworkSelectCardSVG from "@/components/network-select-card/NetworkSelectCardSVG/NetworkSelectCardSVG.tsx";
import TextButton from "@/components/ui/TextButton/TextButton.tsx";

type NetworkSelectCardContentProps = {
  onClose: () => void;
};

const NetworkSelectCardContent = ({ onClose }: NetworkSelectCardContentProps) => {
  return (
    <div
      style={{
        width: "364px",
        height: "224px",
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        justifyContent: "center",
        display: "flex",
      }}
    >
      <NetworkSelectCardSVG>
        <div className="w-full h-full flex justify-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex flex-col items-center justify-center h-full w-full px-6">
            <TextButton>Confirm</TextButton>
          </div>
        </div>
      </NetworkSelectCardSVG>
    </div>
  );
};

export default NetworkSelectCardContent;
