import RotatingText from "@/blocks/TextAnimations/RotatingText/RotatingText.tsx";
import { useMemo, memo } from "react";

type AnimatedProgressBarProps = {
  progress: number; // 0 to 100
};

// Define props type for NumberColumn
type NumberColumnProps = {
  delay?: number;
  direction?: "up" | "down";
  startNumber?: number;
};

const ProgressBar = ({ progress }: AnimatedProgressBarProps) => {
  // const [progress, setProgress] = useState(0);

  // // Simulate progress loading
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setProgress((prev) => {
  //       if (prev >= 100) return 100;
  //       return prev + 1;
  //     });
  //   }, 100);

  //   return () => clearInterval(interval);
  // }, []);

  const generateNumbers = (startOffset = 0) => {
    return Array.from({ length: 10 }, (_, i) => (i + startOffset) % 10);
  };

  const NumberColumn = memo(
    ({ delay = 0, direction = "up", startNumber = 0 }: NumberColumnProps) => (
      <div className="flex flex-col overflow-hidden h-full opacity-30 w-6">
        <div
          className="flex flex-col text-[10px] text-lightGreen"
          style={{ animationDelay: `${delay}s` }}
        >
          <div className="relative">
            <div
              className="absolute top-3 h-6 left-0 right-0 z-10 bg-darkGreen text-xl text-transparent"
              style={{
                boxShadow:
                  "0 0 10px 5px rgba(6, 40, 23, 0.3), inset 0 0 10px 2px rgba(6, 40, 23, 0.2)",
                filter: "blur(4px)",
              }}
            >
              {"Nori"}
            </div>

            <div
              className={`flex flex-col ${
                direction === "up"
                  ? "animate-[scrollUp_20s_linear_infinite]"
                  : "animate-[scrollDown_20s_linear_infinite]"
              }`}
            >
              {generateNumbers(startNumber).map((num) => (
                <span
                  key={num}
                  className="h-4 text-md flex items-center justify-center"
                >
                  {num}
                </span>
              ))}
              {generateNumbers(startNumber).map((num) => (
                <span
                  key={`dup-${num}`}
                  className="h-4 flex text-md items-center justify-center"
                >
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  );

  NumberColumn.displayName = "NumberColumn";

  const numberColumns = useMemo(() => {
    return Array.from({ length: 54 }, (_, colIndex) => {
      // Create a pseudo-random but deterministic number based on column index
      const pseudoRandom = ((colIndex * 7 + 3) % 9) + 1;

      return (
        <NumberColumn
          key={colIndex}
          delay={colIndex * 0.1}
          direction={colIndex % 2 === 0 ? "up" : "down"}
          startNumber={pseudoRandom}
        />
      );
    });
  }, []);

  return (
    <div className="w-full py-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="relative w-full h-10 border border-white/20 rounded-lg overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex flex-row justify-start items-stretch px-2">
              {numberColumns}
            </div>
          </div>
          <div
            //progress bar using hex and via to obtain horizontal shimmer effect
            className="absolute top-0 left-0 h-full bg-gradient-to-b from-[#55C374] via-[#82FCA5] to-[#55C374] transition-all duration-300 ease-out rounded-lg z-10"
            style={{
              width: `${progress}%`,
              boxShadow: "10px 0 30px lightGreen",
            }}
          >
            {progress === 100 && (
              <div className="w-full h-full flex justify-center items-center z-15">
                <RotatingText
                  texts={["Taking longer than expected!", ""]}
                  mainClassName="px-2 sm:px-2 md:px-3 bg-transparent text-darkGreen overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
                  staggerFrom={"first"}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-120%" }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  rotationInterval={2000}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollUp {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-160px);
          }
        }

        @keyframes scrollDown {
          0% {
            transform: translateY(-160px);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
