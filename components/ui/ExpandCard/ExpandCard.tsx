"use client";

import { useState, useRef, useEffect } from "react";

type ExpandCardProps = {
  children: React.ReactNode;
  className?: string;
  isExpandActive: boolean;
  setIsExpandActive: (active: boolean) => void;
};

const ExpandCard = ({
  children,
  isExpandActive,
  setIsExpandActive,
  className,
}: ExpandCardProps) => {
  const cardRef = useRef(null);

  const [transform, setTransform] = useState({
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
  });

  const setCenter = () => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate translation needed to center the card
    const deltaX = viewportWidth / 2 - rect.x - rect.width / 2;
    const deltaY = viewportHeight / 2 - rect.y - rect.height / 2;

    // Calculate scale to make card bigger (but not too big)
    const scaleW = (viewportWidth / rect.width) * 0.9;
    const scaleH = (viewportHeight / rect.height) * 0.9;
    const scale = Math.min(scaleW, scaleH, 1.75); // Max scale of 1.75

    return { deltaX, deltaY, scale };
  };

  const handleClick = () => {
    // if (!isExpandActive) {
    //   // Activate - center and scale up
    //   const { deltaX, deltaY, scale } = setCenter();

    //   setTransform({
    //     translateX: deltaX,
    //     translateY: deltaY,
    //     scale: scale,
    //     rotateX: 360,
    //     rotateY: 0,
    //   });

    //   setIsExpandActive(true);

    //   // Prevent body scroll when card is active
    //   document.body.style.overflow = "hidden";
    // } else {
    // Deactivate - return to normal
    retreat();
    // }
  };

  useEffect(() => {
    if (isExpandActive) {
      // Activate - center and scale up
      const { deltaX, deltaY, scale } = setCenter();
      setTransform({
        translateX: deltaX,
        translateY: deltaY,
        scale: scale,
        rotateX: 360,
        rotateY: 0,
      });
      // Prevent body scroll when card is active
      document.body.style.overflow = "hidden";
    }
  }, [isExpandActive]);

  const retreat = () => {
    setTransform({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotateX: 0,
      rotateY: 0,
    });
    setIsExpandActive(false);

    // Re-enable body scroll
    document.body.style.overflow = "";
  };

  const handleReposition = () => {
    if (isExpandActive && cardRef.current) {
      const { deltaX, deltaY, scale } = setCenter();
      setTransform((prev) => ({
        ...prev,
        translateX: deltaX,
        translateY: deltaY,
        scale: scale,
      }));
    }
  };

  useEffect(() => {
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition);
      document.body.style.overflow = "";
    };
  }, [isExpandActive]);

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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
          onClick={retreat}
        />
      )}

      {/* Card container */}
      <div
        className={`inline-block transition-none ${className}`}
        style={{
          perspective: "2000px",
          zIndex: isExpandActive ? 50 : 1,
        }}
      >
        <div
          ref={cardRef}
          className={`relative cursor-pointer transition-all duration-700 ease-out ${
            isExpandActive ? "z-50" : "z-0"
          }`}
          style={{
            transform: `
              translate3d(${transform.translateX}px, ${transform.translateY}px, 0.1px)
              scale(${transform.scale})
              rotateX(${transform.rotateX}deg)
              rotateY(${transform.rotateY}deg)
            `,
            transformStyle: "preserve-3d",
            transitionProperty: "transform",
          }}
          onClick={handleClick}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default ExpandCard;
