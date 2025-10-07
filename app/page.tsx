"use client";
import BridgeControlCard from "@/components/bridge-control-card/BridgeControlCard.tsx";
import Nori from "@/public/assets/Nori.svg";
import BottomShadows from "@/public/assets/BottomShadows.svg";
import ScrollingBridge from "@/components/panels/ScrollingBridge/ScrollingBridge.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import ScrollingWSS from "@/components/panels/ScrollingWSS/ScrollingWSS.tsx";
import { useAccount } from "wagmina";
import Notification from "@/components/ui/Notification/Notification.tsx";
import ChooseSides from "@/components/choose-side/ChooseSides.tsx";
import { useBridgeControlCardProps } from "@/helpers/useBridgeControlCardProps.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { Store } from "@/helpers/localStorage2.ts";
import { useEffect, useState } from "react";
import LaserFlow from "@/blocks/Animations/LaserFlow/LaserFlow.jsx";

export default function Home() {
  const [showMobileWarning, setShowMobileWarning] = useState<boolean>(false);

  const { showChooseSide } = useProgress();

  const { isConnected: ethConnected } = useMetaMaskWallet();
  const { isConnected: minaConnected } = useAccount();
  const { title, component } = useBridgeControlCardProps();
  const { state: bridgeState } = useNoriBridge();

  useEffect(() => {
    const checkWidth = () => {
      setShowMobileWarning(window.innerWidth < 768);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);

    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  return (
    <div className="h-full w-full bg-[radial-gradient(50%_100%_at_50%_0%,theme('colors.darkGreen')_1.31%,theme('colors.veryDarkGreen')_100%)]">
      {/* Mobile Warning Modal */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-darkGreen border border-lightGreen rounded-lg p-8 max-w-sm mx-4 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-3">
                Screen Too Small
              </h2>
              <p className="text-gray-300 mb-2">
                Nori App is not currently supported on mobile devices
              </p>
            </div>
          </div>
        </div>
      )}
      {showChooseSide || Store.global().showFactionClaim ? (
        <ChooseSides />
      ) : (
        <div className="flex h-full w-full flex-col relative bg-custom-svg bg-no-repeat bg-cover bg-center">
          <div className="absolute w-full justify-center my-5 flex">
            <Nori className="scale-[1]" />
          </div>
          <div className="flex flex-grow w-full justify-center items-center h-full">
            {/* Left LaserFlow */}
            <div className="w-1/4 h-[450px] flex items-center justify-end pr-4 relative overflow-hidden">
              <div
                style={{
                  width: "500px",
                  height: "1200px",
                  left: "200px",
                  zIndex: 1,
                }}
              >
                <LaserFlow
                  style={{ width: "800px" }}
                  className={"-rotate-90"}
                  horizontalBeamOffset={-0.0}
                  verticalBeamOffset={-0.095}
                  color="#64E18E"
                  horizontalSizing={1}
                  verticalSizing={4}
                  fogIntensity={0.6}
                  wispIntensity={6.0}
                  dpr={undefined}
                />
              </div>
            </div>

            {/* Center Bridge Control Card */}
            <div className="relative inline-block w-[830px] h-[550px] z-10">
              <BridgeControlCard
                title={
                  ethConnected && minaConnected
                    ? title
                    : "First connect wallets"
                }
                width={"100%"}
                height={"100%"}
                content={ethConnected && minaConnected ? component : null}
              />
            </div>

            {/* Right LaserFlow */}
            <div className="w-1/4 h-[450px] flex items-center justify-start pl-4 relative"></div>
          </div>
          <div>
            <Notification
              content={"Wallet Linking Is Required For The First Time"}
              show={!ethConnected || !minaConnected}
            />
          </div>

          {bridgeState.context.mintWorker?.areContractCompiled() && (
            <div className="mb-6 text-white/30 text-xs flex justify-end z-10">
              {`Contracts compiled in: ${bridgeState.context.mintWorker?.getLastCompileTimeSeconds()}s`}
            </div>
          )}

          <div className="flex w-full justify-center relative">
            <BottomShadows
              className="absolute bottom-[-100px] scale-[0.9]"
              title="BottomShadows"
            />
          </div>
        </div>
      )}
    </div>
  );
}
