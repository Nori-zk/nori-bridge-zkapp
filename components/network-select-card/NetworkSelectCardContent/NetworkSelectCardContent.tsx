import NetworkSelectCardSVG from "@/components/network-select-card/NetworkSelectCardSVG/NetworkSelectCardSVG.tsx";
import SingleSelect from "@/components/ui/SingleSelect/SingleSelect.tsx";
import TextButton from "@/components/ui/TextButton/TextButton.tsx";
import { useAuroWallet } from "@/providers/AuroWalletProvider/AuroWalletProvider.tsx";
import { chainOptions } from "@/static_data.ts";

type NetworkSelectCardContentProps = {
  onClose: () => void;
};

const NetworkSelectCardContent = ({
  onClose,
}: NetworkSelectCardContentProps) => {
  const { selectedChain, setSelectedChain } = useAuroWallet();

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
          >
            ✕
          </button>
          <div className="flex flex-col justify-center items-center h-full w-full px-6">
            <div className="justify-start w-full text-white/30">RPC URL</div>
            <div className="w-full text-white/30 my-1">
              <SingleSelect
                options={chainOptions}
                value={selectedChain}
                onChange={(option) => {
                  setSelectedChain(option);
                }}
              />
            </div>
            <div className="flex-col w-full justify-center">
              <TextButton>Confirm</TextButton>
            </div>
          </div>
        </div>
      </NetworkSelectCardSVG>
    </div>
  );
};

export default NetworkSelectCardContent;
