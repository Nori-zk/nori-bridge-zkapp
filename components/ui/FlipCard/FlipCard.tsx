"use client";
import { useMetaMaskWallet } from "@/providers/MetaMaskWalletProvider/MetaMaskWalletProvider.tsx";
import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmina";

type FlipCardProps = {
  children: React.ReactNode;
  className?: string;
  isExpandActive: boolean;
  setIsExpandActive: (active: boolean) => void;
  isTransitioning: boolean;
  setIsTransitioning: (transitioning: boolean) => void;
};

const FlipCard = ({
  children,
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

  useEffect(() => {
    if (isExpandActive) {
      // Start transition
      setIsTransitioning(true);

      // Flip to 180 degrees
      setRotateX(180);

      // End transition after animation completes (700ms)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
    }
  }, [isExpandActive, setIsTransitioning]);

  //https://youtu.be/6T7KK-TVAek?si=tLs82eokPiCDk6hr&t=59
  const retreat = () => {
    // Start transition
    setIsTransitioning(true);

    // Flip back to 0 degrees
    setRotateX(0);
    setIsExpandActive(false);

    // End transition after animation completes (700ms)
    setTimeout(() => {
      setIsTransitioning(false);
    }, 700);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isExpandActive) {
        retreat();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpandActive]);

  return (
    <>
      {/* Backdrop overlay */}
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
        {/* Rotating container with box shadow */}
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
          {/* Counter-rotate content to keep it readable */}
          <div
            className="w-full h-full"
            style={{
              transform: `rotateX(${-rotateX}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default FlipCard;
