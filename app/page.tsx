"use client";
import BridgeControlCard from "@/components/bridge-control-card/BridgeControlCard.tsx";
import Nori from "@/public/assets/Nori.svg";
import BottomShadows from "@/public/assets/BottomShadows.svg";
import ScrollingBridge from "@/components/panels/ScrollingBridge/ScrollingBridge.tsx";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import ScrollingWSS from "@/components/panels/ScrollingWSS/ScrollingWSS.tsx";
import { useAccount } from "wagmina";
// import Notification from "@/components/ui/Notification/Notification.tsx";
// import Flip from "@/public/assets/Flip.svg";
import Notification from "@/components/ui/Notification/Notification.tsx";
import Flip from "@/public/assets/Flip.svg";
import { DepositMintTestUI } from "@/components/DepositMintTestUI.tsx";
import { useState } from "react";
import ChooseSides from "@/components/choose-side/ChooseSides.tsx";
import { useBridgeControlCardProps } from "@/helpers/useBridgeControlCardProps.tsx";
import LockTokens from "@/components/bridge-control-card/ProgressSteps/LockTokens.tsx";
import GetLockedTokens from "@/components/bridge-control-card/ProgressSteps/GetLockedTokens.tsx";
// import SetupStorage from "@/components/bridge-control-card/ProgressSteps/SetupStorage.tsx";
import { ProgressStep } from "@/types/types.ts";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

const stepComponents: Record<ProgressStep, React.ComponentType> = {
  lock_tokens: LockTokens,
  // setup_storage: SetupStorage,
  get_locked_tokens: GetLockedTokens,
};

export default function Home() {
  const [showChooseSide, setShowChooseSide] = useState<boolean>(false);

  const { isConnected: ethConnected } = useMetaMaskWallet();
  const { isConnected: minaConnected } = useAccount();
  const { state: progressState } = useProgress();
  const { title, component } = useBridgeControlCardProps(
    progressState.currentStep
  );
  const { state: bridgeState } = useNoriBridge();

  return (
    <div className="h-full w-full bg-[radial-gradient(50%_100%_at_50%_0%,theme('colors.darkGreen')_1.31%,theme('colors.veryDarkGreen')_100%)]">
      {showChooseSide ? (
        <ChooseSides />
      ) : (
        // <div className="flex h-full w-full flex-col relative bg-custom-svg bg-no-repeat bg-cover bg-center">
        //   <div className="absolute w-full justify-center my-5 flex">
        //     <Nori className="scale-[1]" />
        //   </div>

        //   <button
        //     className="text-white"
        //     onClick={() => setShowChooseSide(true)}
        //   >
        //     Show choose side
        //   </button>
        //   <div className="flex flex-grow w-full justify-center items-center h-full">
        //     <div className="w-1/4 h-[450px]">
        //       {ethConnected && minaConnected && <ScrollingWSS />}
        //     </div>
        //     {/* <DepositMintTestUI /> */}
        //     <div className="relative inline-block">
        //       <BridgeControlCard
        //         title={
        //           ethConnected && minaConnected
        //             ? title
        //             : "First connect wallets"
        //         }
        //         width={"780"}
        //         height={"450"}
        //         content={ethConnected && minaConnected ? component : null}
        //       />
        //       {/* <button
        //         onClick={() => console.log("Flip pressed")}
        //         className="absolute -top-1 -right-11 z-20 transition-all duration-300 ease-in-out hover:scale-110 hover:rotate-6"
        //       >
        //         <Flip
        //           width={65}
        //           height={65}
        //           className="scale-[0.82] fill-red-100 transition-colors duration-300 ease-in-out group-hover:fill-red-300"
        //         />
        //       </button> */}
        //     </div>
        //     <div className="w-full h-[450px]">
        //       {ethConnected && minaConnected && <ScrollingBridge />}
        //     </div>
        //   </div>
        //   <div>
        //     <Notification
        //       content={"Wallet Linking Is Required For The First Time"}
        //       show={!ethConnected || !minaConnected}
        //     />
        //   </div>
        //   {/* <div className="mb-6 text-white/30 text-xs flex justify-end z-10">
        //     Powered by{" "}
        //     <a
        //       href="https://www.coingecko.com/en/api"
        //       target="_blank"
        //       rel="noopener noreferrer"
        //       onClick={(e) => e.stopPropagation()}
        //       className="z-10 mx-1 hover:underline"
        //     >
        //       CoinGecko API
        //     </a>
        //   </div> */}

        //   {bridgeState.context.mintWorker?.areContractCompiled() && (
        //     <div className="mb-6 text-white/30 text-xs flex justify-end z-10">
        //       {`Contracts compiled in: ${bridgeState.context.mintWorker?.getLastCompileTimeSeconds()}s`}
        //     </div>
        //   )}

        //   <div className="flex w-full justify-center relative">
        //     <BottomShadows
        //       className="absolute bottom-[-100px] scale-[0.9]"
        //       title="BottomShadows"
        //     />
        //   </div>
        // </div>
        <InfiniteBridge />
      )}
    </div>
  );
}

export function InfiniteBridge() {
  const Bridge = "/assets/Bridge.png";

  return (
    <div className="w-full h-64 overflow-hidden relative bg-sky-100">
      <div className="absolute inset-0 flex">
        {/* First set of bridges */}
        <div className="flex animate-scroll-seamless">
          {[...Array(3)].map((_, i) => (
            <img
              key={`set1-${i}`}
              src={Bridge}
              alt="Bridge"
              className="h-full w-auto flex-shrink-0 block"
            />
          ))}
        </div>
        {/* Second set for seamless continuation */}
        <div className="flex animate-scroll-seamless">
          {[...Array(3)].map((_, i) => (
            <img
              key={`set2-${i}`}
              src={Bridge}
              alt="Bridge"
              className="h-full w-auto flex-shrink-0 block"
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-seamless {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-scroll-seamless {
          animation: scroll-seamless 45s linear infinite;
        }
      `}</style>
    </div>
  );
}
