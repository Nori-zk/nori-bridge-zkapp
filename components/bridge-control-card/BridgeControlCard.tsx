import { useEffect, useState } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import CreateCredentials from "./ProgressSteps/CreateCredentials.tsx";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import { FaArrowRight } from "react-icons/fa";
import ObtainCredentials from "@/components/bridge-control-card/ProgressSteps/ObtainCredentials.tsx";
import LockTokens from "./ProgressSteps/LockTokens.tsx";
import GetLockedTokens from "./ProgressSteps/GetLockedTokens.tsx";
import { useZkappWorker } from "@/providers/ZkWorkerProvider/ZkWorkerProvider.tsx";
import BridgeControlCardSVG from "./BridgeControlCardSVG.tsx";
import ConnectWallets from "./ProgressSteps/ConnectWallets.tsx";
import { progressSteps } from "@/static_data.ts";
import ProgressTracker from "../ui/ProgressTracker/ProgressTracker.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";

type BridgeControlCardProps = {
  title: string;
  width?: string;
  height?: string;
};

const BridgeControlCard = (props: BridgeControlCardProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [displayProgressSteps, setDisplayProgressSteps] = useState(false);
  const [depositNumber, setDepositNumberInput] = useState<string>("12345");

  const { title } = props;
  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { zkappWorkerClient, isLoading: isWorkerLoading } = useZkappWorker();

  const {
    state,
    setDepositNumber,
    isLoading: noriLoading,
    isLoading,
    isReady,
    isError,
  } = useNoriBridge();

  const getStatusColor = () => {
    if (isError) return "text-red-600";
    if (isLoading) return "text-yellow-600";
    if (isReady) return "text-green-600";
    return "text-gray-600";
  };

  const getStateDisplay = () => {
    if (typeof state.value === "string") {
      return state.value;
    }
    return JSON.stringify(state.value);
  };

  const handleSetDepositNumber = () => {
    const num = parseInt(depositNumber);

    console.log("Setting deposit number to:", num);
    setDepositNumber(num);
  };

  useEffect(() => {
    setIsMounted(true);
    if (progressSteps.length > 0) {
      setDisplayProgressSteps(true);
    }
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
          ethConnected && minaConnected
            ? "-30px 0px 20px -15px lightGreen, 30px 0px 20px -15px LightGreen"
            : "none",
        borderRadius: "20px",
      }}
    >
      <BridgeControlCardSVG width={props.width} height={props.height}>
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-center text-white text-4xl mb-6 font-[400]">
            {title}
          </h1>
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
            <div className="flex justify-center mt-1 text-white">
              {/* {isWorkerLoading || !state.context.zkappWorkerClient ? (
                <p>Spinning up zkappWorker...</p>
              ) : !zkappWorkerClient ? (
                <p>zkappWorker is not ready.</p>
              ) : !credential && !compiledEcdsaCredential ? (
                <p>Running step compiledEcdsaCredential...</p>
              ) : !(ethConnected && minaConnected) ||
                !ethConnected ||
                !minaConnected ? (
                <ConnectWallets />
              // ) : state.context.step === "create" ? (
              //   <CreateCredentials />
              // ) : state.context.step === "obtain" ? (
              //   <ObtainCredentials />
              // ) : state.context.step === "lock" ? (
              //   <LockTokens />
              // ) : (
              //   <GetLockedTokens />
              )} */}
            </div>
          </div>
          {displayProgressSteps && <ProgressTracker steps={progressSteps} />}

          {/* Current State Display */}
          <div className="flex justify-around items-center">
            <div className="p-4">
              <div className={`font-mono text-sm ${getStatusColor()}`}>
                State: <span className="font-bold">{getStateDisplay()}</span>
              </div>
              {isLoading && (
                <div className="text-yellow-600 mt-1">⏳ Loading...</div>
              )}
              {isError && (
                <div className="text-red-600 mt-1">
                  ❌ Error: {state.context.errorMessage}
                </div>
              )}
              {isReady && <div className="text-green-600 mt-1">✅ Ready</div>}
            </div>
            <div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Deposit Block Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={depositNumber}
                    onChange={(e) => setDepositNumberInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., 12345"
                  />
                  <button
                    onClick={handleSetDepositNumber}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Set
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Current: {state.context.activeDepositNumber || "Not set"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </BridgeControlCardSVG>
    </div>
  );
};

export default BridgeControlCard;
