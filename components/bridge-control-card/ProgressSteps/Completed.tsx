import { useNoriBridge } from "@/providers/NoriBridgeProvider/NoriBridgeProvider.tsx";
import { FaXTwitter } from "react-icons/fa6";

const Completed = () => {
  const { reset } = useNoriBridge();

  const handleTwitterShare = () => {
    const message = encodeURIComponent("I just bridged assets using @nori_zk's zkApp Bridge! #MinaProtocol #Ethereum #ZKApps");
    const twitterIntent = `https://twitter.com/intent/tweet?text=${message}`;

    window.open(twitterIntent, '_blank');
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
        className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-white rounded-lg border border-white">
        <div className="flex justify-center items-center">
          <div className="text-xl h-full px-2">Share on </div>
          <FaXTwitter className="w-5 h-5 justify-center items-center align-center" />
        </div>
      </button>
      <button className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-xl text-white rounded-lg border border-white">
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
