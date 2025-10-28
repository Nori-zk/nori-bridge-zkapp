"use client";
import BridgeControlCard from "@/components/bridge-control-card/BridgeControlCard/BridgeControlCard.tsx";
import Nori from "@/public/assets/Nori.svg";
import BottomShadows from "@/public/assets/BottomShadows.svg";
import ScrollingBridge from "@/components/panels/ScrollingBridge/ScrollingBridge.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import Notification from "@/components/ui/Notification/Notification.tsx";
import ChooseSides from "@/components/choose-side/ChooseSides.tsx";
import { useBridgeControlCardProps } from "@/helpers/useBridgeControlCardProps.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { Store } from "@/helpers/localStorage2.ts";
import { useEffect, useState } from "react";
import LaserFlow from "@/blocks/Animations/LaserFlow/LaserFlow.jsx";
import Flip from "@/public/assets/Flip.svg";
import FlipCard from "@/components/ui/FlipCard/FlipCard.tsx";
import TransactionCard from "@/components/transaction-card/TransactionCard/TransactionCard.tsx";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [showMobileWarning, setShowMobileWarning] = useState<boolean>(false);
  const [isExpandActive, setIsExpandActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
            <div
              className="w-1/4 h-[450px] flex items-center justify-end pr-4 relative overflow-hidden"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, white 15%, white 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, white 15%, white 100%)",
              }}
            >
              <AnimatePresence mode="wait">
                {ethConnected &&
                  minaConnected &&
                  !isExpandActive &&
                  !isTransitioning && (
                    <motion.div
                      key="laser-flow"
                      style={{
                        width: "500px",
                        height: "1200px",
                        left: "200px",
                        zIndex: 1,
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
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
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
            <div className="relative inline-block w-[830px] h-[550px] z-10">
              <FlipCard
                className="w-full h-full"
                isExpandActive={isExpandActive}
                setIsExpandActive={setIsExpandActive}
                isTransitioning={isTransitioning}
                setIsTransitioning={setIsTransitioning}
                frontContent={
                  <div className="relative inline-block w-full h-full z-10">
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
                    {!isExpandActive && ethConnected && minaConnected && (
                      <button
                        onClick={() => {
                          setIsExpandActive(true);
                          console.log("Flip pressed");
                        }}
                        className="absolute -top-0 -right-10 z-20"
                      >
                        <Flip width={57} height={57} />
                      </button>
                    )}
                  </div>
                }
                backContent={
                  <div className="w-full h-full">
                    <TransactionCard
                      width={"100%"}
                      height={"100%"}
                      title={"Transaction Details"}
                    />
                  </div>
                }
              />
            </div>
            <div className="w-1/4 h-[450px]">
              <AnimatePresence mode="wait">
                {ethConnected &&
                  minaConnected &&
                  !isExpandActive &&
                  !isTransitioning && (
                    <ScrollingBridge key="scrolling-bridge" />
                  )}
              </AnimatePresence>
            </div>
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
