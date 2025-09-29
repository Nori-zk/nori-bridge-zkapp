// components/ScrollingBridge.js
import Image from "next/image";

const ScrollingBridge = () => {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden w-full h-[2937px]">
        <div className="absolute animate-scroll">
          <img
            src="/assets/Bridge.png"
            alt="Bridge"
            // className="inline-block w-[12218px] h-[2937px] object-cover"
          />
          {/* <img
            src="/assets/Bridge.png"
            alt="Bridge"
            // className="inline-block w-[12218px] h-[2937px] object-cover"
          /> */}
        </div>
      </div>

      <style>{`
  .animate-scroll {
    animation: scroll 20s linear infinite;
  }
  @keyframes scroll {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
`}</style>
    </div>
  );
};

export default ScrollingBridge;
