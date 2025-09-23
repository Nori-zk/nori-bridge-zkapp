"use client";
import { useState } from "react";
import { ChooseSideTypes } from "@/types/types.ts";
import { useChooseSideProps } from "@/helpers/useChooseSideProps.tsx";

type ChooseSideProps = {
  side: ChooseSideTypes;
};

const ChooseSide = ({ side }: ChooseSideProps) => {
  const [hovered, setHovered] = useState(false);
  const {
    radialBg,
    rightBgSvg,
    leftBgSvg,
    bottomShadowSvg,
    mainImage,
    textValue,
    joinButtonBgClass,
    joinButtonTextClass,
  } = useChooseSideProps(side);

  return (
    <div
      className={`bg-choose-side-${radialBg} h-screen relative bg-cover bg-no-repeat flex items-center justify-center border border-transparent hover:border-glow-${joinButtonBgClass} transition-all`}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
    >
      <div className="absolute inset-0 flex">
        <div className="h-full w-1/2">{leftBgSvg}</div>
        <div className="h-full w-1/2">{rightBgSvg}</div>
      </div>

      <div className="grid grid-rows-5 h-full relative z-10 w-full max-w-4xl mx-auto">
        <div className="flex h-full">
          {hovered && (
            <div className="flex h-full w-full px-10 items-end text-white">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
          )}
        </div>
        <div className="flex flex-col row-span-3 items-center justify-center">
          {mainImage}
          <div>{bottomShadowSvg}</div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          <p
            className={`text-2xl text-${joinButtonTextClass} text-glow-neon-${joinButtonBgClass}`}
          >
            {textValue}
          </p>
          <button
            className={`bg-button-choose-side-${joinButtonBgClass} w-1/3 max-w-xs rounded-lg py-3 text-${joinButtonTextClass} text-glow-neon-${joinButtonBgClass} font-normal hover:scale-105 transition-transform text-xl`}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseSide;
