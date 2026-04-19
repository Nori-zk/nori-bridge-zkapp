import NetworkSelectCardSVG from "@/components/network-select-card/NetworkSelectCardSVG/NetworkSelectCardSVG.tsx";
import SingleSelect from "@/components/ui/SingleSelect/SingleSelect.tsx";
import TextButton from "@/components/ui/TextButton/TextButton.tsx";
import TextInput from "@/components/ui/TextInput/TextInput.tsx";
import { useAuroWallet } from "@/providers/AuroWalletProvider/AuroWalletProvider.tsx";
import { chainOptions } from "@/static_data.ts";
import { useState } from "react";

type NetworkSelectCardContentProps = {
  onClose: () => void;
};

const NetworkSelectCardContent = ({
  onClose,
}: NetworkSelectCardContentProps) => {
  const { selectedChain, setSelectedChain, setChainAddress } = useAuroWallet();
  const [customRpcUrl, setCustomRpcUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const isCustom = selectedChain?.chainId === "custom";

  const handleConfirm = () => {
    if (!customRpcUrl.trim()) {
      setUrlError("RPC URL is required");
      return;
    }
    setUrlError(undefined);
    setChainAddress(customRpcUrl.trim());
  };

  const cardHeight = 300;

  return (
    <div
      style={{
        width: "364px",
        height: `${cardHeight}px`,
        position: "relative",
        overflow: "hidden",
        borderRadius: "20px",
        justifyContent: "center",
        display: "flex",
      }}
    >
      <NetworkSelectCardSVG height={cardHeight}>
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
            {isCustom && (
              <>
                <div className="w-full my-2">
                  <div className="justify-start w-full text-white/30">
                    Your URL
                  </div>
                  <TextInput
                    value={customRpcUrl}
                    onChange={(e) => {
                      setCustomRpcUrl(e.target.value);
                      setUrlError(undefined);
                    }}
                    placeholder="https://..."
                    hasValue={customRpcUrl.length > 0}
                    showIcon={false}
                    errorMessage={urlError}
                  />
                </div>
                <div className="w-full my-2">
                  <TextButton
                    onClick={handleConfirm}
                    className="hover:bg-lightGreen hover:text-darkGreen hover:border-lightGreen"
                  >
                    Confirm
                  </TextButton>
                </div>
              </>
            )}
          </div>
        </div>
      </NetworkSelectCardSVG>
    </div>
  );
};

export default NetworkSelectCardContent;
