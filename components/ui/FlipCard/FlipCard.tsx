"use client";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useState, useRef, useEffect, ReactNode } from "react";
import { useAccount } from "wagmina";

type FlipCardProps = {
  frontContent: ReactNode;
  backContent: ReactNode;
  className?: string;
  isExpandActive: boolean;
  setIsExpandActive: (active: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
};

const FlipCard = ({
  frontContent,
  backContent,
  isExpandActive,
  setIsExpandActive,
  className,
  isTransitioning,
  setIsTransitioning,
}: FlipCardProps) => {
  const cardRef = useRef(null);
  const { isConnected: ethConnected } = useMetaMaskWallet();
  const { isConnected: minaConnected } = useAccount();

  const [rotateX, setRotateX] = useState(0);
  const [showingFront, setShowingFront] = useState(true);

  useEffect(() => {
    if (isExpandActive) {
      // Start transition - keep showing front initially
      setIsTransitioning(true);

      // Flip to 180 degrees
      setRotateX(180);

      // At 90 degrees (halfway through), switch to back content
      setTimeout(() => {
        setShowingFront(false);
      }, 275);

      // End transition after animation completes (1500ms)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1500);
    }
  }, [isExpandActive, setIsTransitioning]);

  //https://youtu.be/6T7KK-TVAek?si=tLs82eokPiCDk6hr&t=59
  const retreat = () => {
    // Start transition - keep showing back initially
    setIsTransitioning(true);

    // Flip back to 0 degrees
    setRotateX(0);

    // At 90 degrees (halfway through), switch back to front content
    setTimeout(() => {
      setShowingFront(true);
    }, 275);

    setIsExpandActive(false);

    // End transition after animation completes (1500ms)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 1500);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpandActive) {
        retreat();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpandActive]);

  return (
    <>
      {/* Backdrop overlay - when clicked flip to front */}
      {isExpandActive && (
        <div
          className="fixed inset-0 "
          style={{ zIndex: 40 }}
          onClick={retreat}
        />
      )}

      {/* Perspective container */}
      <div
        className={`inline-block ${className}`}
        style={{
          perspective: "2000px",
          zIndex: isExpandActive ? 50 : 1,
          position: "relative",
        }}
      >
        {/* Rotating container */}
        <div
          ref={cardRef}
          className={`relative transition-all duration-[1.5s] ease-out`}
          style={{
            transform: `rotateX(${rotateX}deg)`,
            transformStyle: "preserve-3d",
            transitionProperty: "transform",
            boxShadow:
              ethConnected && minaConnected && !isTransitioning
                ? "-30px 0px 20px -15px lightGreen, 30px 0px 20px -15px LightGreen"
                : "none",
            borderRadius: "20px",
          }}
        >
          {/* Render content, rotate and flip to get transaction card upright */}
          <div
            className={`w-full h-full ${showingFront ? null : "rotate-180"} ${
              showingFront ? null : "-scale-x-100"
            }`}
          >
            {showingFront ? frontContent : backContent}
          </div>
        </div>
      </div>
    </>
  );
};

export default FlipCard;
