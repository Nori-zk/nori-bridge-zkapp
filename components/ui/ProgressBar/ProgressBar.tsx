import React, { useState, useEffect, useMemo } from "react";

const AnimatedProgressBar = () => {
  const [progress, setProgress] = useState(0);

  // Simulate progress loading
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const generateNumbers = (startOffset = 0) => {
    return Array.from({ length: 10 }, (_, i) => (i + startOffset) % 10);
  };

  const NumberColumn = React.memo(
    ({ delay = 0, direction = "up", startNumber = 0 }) => (
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
    return Array.from({ length: 30 }, (_, colIndex) => {
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
    <div className="px-7 py-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="relative w-full h-10 border border-white/20 rounded-lg overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex flex-row justify-start items-stretch px-2">
              {numberColumns}
            </div>
          </div>
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-lightGreen to-lightGreen transition-all duration-300 ease-out rounded-lg z-10"
            style={{
              width: `${progress}%`,
              boxShadow: "5px 0 10px lightGreen",
            }}
          >
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

export default AnimatedProgressBar;
