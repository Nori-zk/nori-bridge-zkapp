import React, { useState, useEffect } from "react";

const AnimatedProgressBar = () => {
  const [progress, setProgress] = useState(50);

  // Simulate progress loading
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100; // Reset for demo
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Generate numbers for animation
  const generateNumbers = () => {
    return Array.from({ length: 10 }, (_, i) => i);
  };

  // Create a single column of animated numbers (one digit wide)
  const NumberColumn = ({ delay = 0, direction = "up" }) => (
    <div className="flex flex-col overflow-hidden h-full opacity-30 w-3">
      <div
        className="flex flex-col text-[10px] text-lightGreen"
        style={{ animationDelay: `${delay}s` }}
      >
        <div className="relative">
          {/* Blur overlay section - positioned where numbers pass through */}
          <div
            className="absolute top-3 h-6 left-0 right-0 z-10 bg-darkGreen text-transparent"
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
                ? "animate-[scrollUp_15s_linear_infinite]"
                : "animate-[scrollDown_15s_linear_infinite]"
            }`}
          >
            {generateNumbers().map((num) => (
              <span key={num} className="h-4 flex items-center justify-center">
                {num}
              </span>
            ))}
            {/* Duplicate for seamless loop */}
            {generateNumbers().map((num) => (
              <span
                key={`dup-${num}`}
                className="h-4 flex items-center justify-center"
              >
                {num}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="relative w-full h-12 border border-white/20 rounded-lg overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 flex flex-row justify-start items-stretch px-2">
              {Array.from({ length: 60 }, (_, colIndex) => (
                <NumberColumn
                  key={colIndex}
                  delay={colIndex * 0.1}
                  direction={colIndex % 2 === 0 ? "up" : "down"}
                />
              ))}
            </div>
          </div>
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-darkGreen to-lightGreen transition-all duration-300 ease-out rounded-lg z-10"
            style={{
              width: `${progress}%`,
            }}
          >
            {/* Subtle shine effect */}
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
