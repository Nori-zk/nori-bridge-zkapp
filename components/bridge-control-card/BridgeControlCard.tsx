import { useEffect, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import { useBridging } from "@/providers/BridgingProvider/BridgingProvider.tsx";
import CreateCredentials from "./ProgressSteps/CreateCredentials.tsx";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import { FaArrowRight } from "react-icons/fa";
import ObtainCredentials from "@/components/bridge-control-card/ProgressSteps/ObtainCredentials.tsx";
import LockTokens from "./ProgressSteps/LockTokens.tsx";
import GetLockedTokens from "./ProgressSteps/GetLockedTokens.tsx";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";

type BridgeControlCardProps = {
  title: string;
  width?: string;
  height?: string;
};

const BridgeControlCard = (props: BridgeControlCardProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { title } = props;
  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { state } = useBridging();
  const {
    zkappWorkerClient,
    isLoading: isWorkerLoading,
    compiledEcdsaCredential,
  } = useZkappWorker();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const minaButtonContent = isMounted
    ? minaConnected
      ? formatDisplayAddress(minaAddress ?? "") || "Connect Wallet"
      : "Connect Wallet"
    : "Connect Wallet";

  return (
    <div
      style={{
        width: props.width,
        height: props.height,
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "-30px 0px 20px -15px lightGreen, 30px 0px 20px -15px LightGreen",
        borderRadius: "20px",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="70 0 830 475"
        width="830"
        height="475"
        style={{
          // position: "absolute",
          top: 0,
          left: 0,
          display: "block",
        }}
      >
        <g filter="url(#filter0_d_273_5871)">
          <rect
            x="70"
            width="830"
            height="475"
            rx="20"
            fill="#060A08"
            fillOpacity="0.1"
            shapeRendering="crispEdges"
          />
          <rect
            x="70"
            width="830"
            height="475"
            rx="20"
            fill="url(#paint0_radial_273_5871)"
            fillOpacity="0.2"
            shapeRendering="crispEdges"
          />
          <rect
            x="70.5"
            y="0.5"
            width="829"
            height="474"
            rx="19.5"
            stroke="url(#paint1_linear_273_5871)"
            strokeOpacity="0.1"
            shapeRendering="crispEdges"
          />
          <rect
            x="70.5"
            y="0.5"
            width="829"
            height="474"
            rx="19.5"
            stroke="url(#paint2_radial_273_5871)"
            shapeRendering="crispEdges"
          />
          <rect
            x="70.5"
            y="0.5"
            width="829"
            height="474"
            rx="19.5"
            stroke="url(#paint3_radial_273_5871)"
            shapeRendering="crispEdges"
          />
        </g>
        <foreignObject x="70" y="0" width="830" height="475">
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-center text-white text-3xl mb-6">{title}</h1>
            <div className="w-3/4">
              <div className="flex text-white justify-between items-center">
                <WalletButton
                  id="eth-btn"
                  types={"Ethereum"}
                  content={
                    ethConnected ? ethDisplayAddress ?? "" : "Connect Wallet"
                  }
                />
                <div className="flex items-center justify-center w-7 h-7 text-black bg-white rounded-full mx-2">
                  <FaArrowRight />
                </div>
                <WalletButton
                  id="mina-btn"
                  types={"Mina"}
                  content={minaButtonContent}
                />
              </div>
              <div className="flex justify-center mt-6 text-white">
                {isWorkerLoading || !state.context.zkappWorkerClient ? (
                  <p>Spinning up zkappWorker...</p>
                ) : !zkappWorkerClient ? (
                  <p>zkappWorker is not ready.</p>
                ) : !compiledEcdsaCredential ? (
                  <p>Running step compiledEcdsaCredential...</p>
                ) : state.context.step === "create" ? (
                  <CreateCredentials />
                ) : state.context.step === "obtain" ? (
                  <ObtainCredentials />
                ) : state.context.step === "lock" ? (
                  <LockTokens />
                ) : (
                  <GetLockedTokens />
                )}
              </div>
            </div>
          </div>
        </foreignObject>
        <defs>
          <filter
            id="filter0_d_273_5871"
            x="0"
            y="-20"
            width="970"
            height="635"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feMorphology
              radius="50"
              operator="erode"
              in="SourceAlpha"
              result="effect1_dropShadow_273_5871"
            />
            <feOffset dx="-20" dy="70" dx="20" />
            <feGaussianBlur stdDeviation="60" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_273_5871"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_273_5871"
              result="shape"
            />
          </filter>
          <radialGradient
            id="paint0_radial_273_5871"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(70) rotate(33.5305) scale(995.691 588.873)"
          >
            <stop stopColor="#03FF9F" stopOpacity="0.2" />
            <stop offset="0.2" stopColor="#03FF9F" stopOpacity="0.1" />
            <stop offset="0.48476" stopColor="#03FF9F" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id="paint1_linear_273_5871"
            x1="485"
            y1="0"
            x2="485"
            y2="475"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="#999999" />
          </linearGradient>
          <radialGradient
            id="paint2_radial_273_5871"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(70) rotate(90) scale(264.137 225.049)"
          >
            <stop stopColor="#64E18E" />
            <stop offset="0.25" stopColor="#1F6344" />
            <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="paint3_radial_273_5871"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(900) rotate(90) scale(254.99 244.107)"
          >
            <stop stopColor="#64E18E" />
            <stop offset="0.25" stopColor="#1F6344" />
            <stop offset="1" stopColor="#1F6344" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default BridgeControlCard;
