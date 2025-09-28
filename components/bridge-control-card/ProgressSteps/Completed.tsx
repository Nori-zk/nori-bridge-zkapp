import { FaXTwitter } from "react-icons/fa6";

const Completed = () => {
  return (
    <div className="flex flex-col justify-center w-full py-2">
      <button className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-white rounded-lg border border-white">
        <div className="flex justify-center items-center">
          <div className="text-xl h-full px-2">Share on </div>
          <FaXTwitter className="w-5 h-5 justify-center items-center align-center" />
        </div>
      </button>
      <button className="flex items-center justify-center gap-2 px-4 my-3 py-3 w-full text-xl text-white rounded-lg border border-white">
        {"Pick Your Side"}
      </button>
    </div>
  );
};

export default Completed;
