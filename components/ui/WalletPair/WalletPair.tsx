import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import WalletButton from "../WalletButton/WalletButton.tsx";
import Swap from "@/public/assets/Swap.svg";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { useEffect, useState } from "react";

type WalletPairProps = {
  ethBtnFooterNumericContent?: number;
  minaBtnFooterNumericContent?: number;
};

const WalletPair = ({
  ethBtnFooterNumericContent,
  minaBtnFooterNumericContent,
}: WalletPairProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const minaButtonContent = isMounted
    ? minaConnected
      ? formatDisplayAddress(minaAddress ?? "") || "Connect Wallet"
      : "Connect Wallet"
    : "Connect Wallet";

  return (
    <div>
      <div className="flex text-white justify-between items-center">
        <div>
          <WalletButton
            id="eth-btn"
            types={"Ethereum"}
            content={ethConnected ? ethDisplayAddress ?? "" : "Connect Wallet"}
            width={300}
            height={70}
          />
        </div>
        <div className="flex items-center justify-center w-7 h-7 mx-2">
          <Swap />
        </div>
        <div>
          <WalletButton
            id="mina-btn"
            types={"Mina"}
            content={minaButtonContent}
            width={300}
            height={70}
          />
        </div>
      </div>
      {(ethBtnFooterNumericContent || minaBtnFooterNumericContent) && (
        <div className="flex text-white justify-between items-center">
          <div className="flex flex-start w-full">
            {ethBtnFooterNumericContent && (
              <div className="flex flex-row text-white/50">
                <div className="flex flex-row">
                  <div className="text-sm">{"Locked so far "}</div>
                  <div className="flex items-center text-lightGreen text-sm mx-1">
                    {ethBtnFooterNumericContent}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center w-12 h-7 mx-2" />
          <div className="flex flex-start w-full">
            {minaBtnFooterNumericContent && (
              <div className="flex flex-row text-white/50">
                <div className="flex flex-row">
                  <div className="text-sm">{"Minted so far "}</div>
                  <div className="flex items-center text-lightGreen text-sm mx-1">
                    {minaBtnFooterNumericContent}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPair;
