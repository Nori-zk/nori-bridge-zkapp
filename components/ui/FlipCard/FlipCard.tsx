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

  const [rotateY, setRotateY] = useState(0);

  useEffect(() => {
    if (isExpandActive) {
      // Start transition
      setIsTransitioning(true);

      // Flip to 180 degrees
      setRotateY(180);

      // End transition after animation completes (700ms)
      setTimeout(() => {
        setIsTransitioning(false);
      }, 700);
    }
  }, [isExpandActive, setIsTransitioning]);

  const retreat = () => {
    // Start transition
    setIsTransitioning(true);

    // Flip back to 0 degrees
    setRotateY(0);
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
          className="fixed inset-0 transition-opacity duration-300"
          style={{ zIndex: 40 }}
          onClick={retreat}
        />
      )}

      {/* Card container */}
      <div
        className={`inline-block transition-all duration-700 ease-out ${className}`}
        style={{
          perspective: "2000px",
          zIndex: isExpandActive ? 50 : 1,
          position: "relative",
          boxShadow:
            ethConnected && minaConnected && !isTransitioning
              ? "-30px 0px 20px -15px lightGreen, 30px 0px 20px -15px LightGreen"
              : "none",
          borderRadius: "20px",
        }}
      >
        <div
          ref={cardRef}
          className={`relative transition-all duration-700 ease-out`}
          style={{
            transform: `rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
            transitionProperty: "transform",
          }}
        >
          <div
            style={{
              transform: `rotateY(${-rotateY}deg)`,
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
