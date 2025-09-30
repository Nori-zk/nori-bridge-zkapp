import { auth } from "@/config/firebaseConfig.ts";
import { Store } from "@/helpers/localStorage2.ts";
import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { useProgress } from "@/providers/ProgressProvider/ProgressProvider.tsx";
import { FaXTwitter } from "react-icons/fa6";

const Completed = () => {
  const { reset } = useNoriBridge();
  const { setShowChooseSide } = useProgress();
  const { state } = useNoriBridge();

  const handleTwitterShare = () => {
    const message = encodeURIComponent(
      "I just used @nori_zk's zkApp Token Bridge! Try it yourself at: https://app.nori-zk.com #MinaProtocol #Ethereum #ZK "
    );
    const twitterIntent = `https://twitter.com/intent/tweet?text=${message}`;

    window.open(twitterIntent, "_blank");
  };

  const handlePickSide = async () => {
    const worker = state.context.mintWorker!;
    const minaAddress = worker.minaWalletPubKeyBase58;
    const ethAddress = worker.ethWalletPubKeyBase58;
    const codeChallange = await worker.createCodeChallenge(
      Store.forEth(worker.ethWalletPubKeyBase58).codeVerifier!
    );
    Store.global().test_codeChallange = codeChallange;
    Store.global().test_activeDepositNumber = Store.forPair(
      ethAddress,
      minaAddress
    ).activeDepositNumber!;
    Store.global().test_txAmount = Store.forPair(ethAddress,
      minaAddress).txAmount!;
    Store.global().test_lastEthWallet = ethAddress;
    Store.global().test_lastMinaWallet = minaAddress;

    if (!auth.currentUser) {
      Store.global().showFactionClaim = true;
    }
    setShowChooseSide(true);
  };

  const handleExit = () => {
    // Logic to handle exit action
    console.log("Exit button clicked");
    reset();
  };

  return (
    <div className="flex flex-col justify-center w-full py-2">
      <button
        onClick={handleTwitterShare}
        className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-white rounded-lg border border-white"
      >
        <div className="flex justify-center items-center">
          <div className="text-xl h-full px-2">Share on </div>
          <FaXTwitter className="w-5 h-5 justify-center items-center align-center" />
        </div>
      </button>
      <button onClick={handlePickSide} className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-xl text-white rounded-lg border border-white">
        {"Pick Your Side"}
      </button>
      <button
        onClick={handleExit}
        className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-xl text-lightGreen"
      >
        {"Exit"}
      </button>
    </div>
  );
};

export default Completed;
