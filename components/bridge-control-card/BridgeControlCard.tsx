import { useEffect, useState, ReactNode } from "react";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useAccount } from "wagmina";
import { formatDisplayAddress } from "@/helpers/walletHelper.tsx";
import WalletButton from "@/components/ui/WalletButton/WalletButton.tsx";
import { FaArrowRight } from "react-icons/fa";
import BridgeControlCardSVG from "./BridgeControlCardSVG.tsx";
import { progressSteps } from "@/static_data.ts";
import ProgressTracker from "../ui/ProgressTracker/ProgressTracker.tsx";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { useSetup } from "@/providers/SetupProvider/SetupProvider.tsx";
import DepositProcessing from "./ProgressSteps/DepositProcessingProgress.tsx";
import ProgressBar from "@/components/ui/ProgressBar/ProgressBar.tsx";
import LeftLine from "@/public/assets/LeftLine.svg";
import RightLine from "@/public/assets/RightLine.svg";
import Swap from "@/public/assets/Swap.svg";
import DepositProgress from "./DepositProgress/DepositProgress.tsx";

type BridgeControlCardProps = {
  title: string;
  content?: ReactNode;
  width: string;
  height: string;
};

const BridgeControlCard = (props: BridgeControlCardProps) => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [displayProgressSteps, setDisplayProgressSteps] = useState(false);
  const [depositNumber, setDepositNumberInput] = useState<string>("12345");

  const { state: progressState } = useProgress();
  const { isConnected: ethConnected, displayAddress: ethDisplayAddress } =
    useMetaMaskWallet();
  const { isConnected: minaConnected, address: minaAddress } = useAccount();
  const { currentState } = useNoriBridge();
  const { bridgeSocketConnectionState$ } = useSetup();

  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "reconnecting" | "permanently-closed"
  >("connecting");

  const {
    state,
    setDepositNumber,
    isLoading,
    isReady,
    isError,
    reset,
    hasActiveDeposit,
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

  const handleResetBridge = () => {
    // const num = parseInt(depositNumber);

    // console.log("Setting deposit number to:", num);
    // setDepositNumber(num);
    reset();
    window.location.reload();
  };

  useEffect(() => {
    setIsMounted(true);
    if (progressSteps.length > 0) {
      setDisplayProgressSteps(true);
    }
  }, []);

  useEffect(() => {
    const sub = bridgeSocketConnectionState$.subscribe(setStatus);
    return () => sub.unsubscribe();
  }, [bridgeSocketConnectionState$]);

  const minaButtonContent = isMounted
    ? minaConnected
      ? formatDisplayAddress(minaAddress ?? "") || "Connect Wallet"
      : "Connect Wallet"
    : "Connect Wallet";

  return (
    <div>
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
              {props.title}
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
                <div className="flex items-center justify-center w-7 h-7 mx-2">
                  <Swap />
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
                {props.content}
              </div>
            </div>
            {/* {displayProgressSteps && <ProgressTracker steps={progressSteps} />} */}

            {/* Current State Display */}
            {/* <div className="flex justify-around items-center">
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
                <div className="flex flex-row items-center space-x-2">
                  {/* <label className="block text-sm font-medium mb-1">
                  Deposit Block Number
                </label> */}
            {/* <div className="flex flex-row gap-2">
                  {/* <input
                    type="text"
                    value={depositNumber}
                    onChange={(e) => setDepositNumberInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., 12345"
                  /> */}
            {/* <button
                    onClick={handleSetDepositNumber}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Set
                  </button> 
                </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {state.context.activeDepositNumber || "Not set"}
                  </div>
                  <div className="text-white">{status}</div>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    onClick={handleResetBridge}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div> */}

            {currentState !== 'completed' ?
              <DepositProgress /> : <></>
            }
          </div>
        </BridgeControlCardSVG>
      </div>
    </div>
  );
};

export default BridgeControlCard;
