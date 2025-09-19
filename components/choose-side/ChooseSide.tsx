"use client";
import { ChooseSideTypes } from "@/types/types.ts";
import { useChooseSideProps } from "@/helpers/useChooseSideProps.tsx";

type ChooseSideProps = {
  side: ChooseSideTypes;
};

const ChooseSide = ({ side }: ChooseSideProps) => {
  const {
    radialBg,
    rightBgSvg,
    leftBgSvg,
    mainImage,
    textValue,
    joinButtonClass,
  } = useChooseSideProps(side);

  return (
    <div
      className={`relative w-1/3 flex flex-col items-center justify-center overflow-hidden ${radialBg}`}
    >
      <div className="flex h-full justify-between">
        <div className="h-full">{leftBgSvg}</div>
        <div className="h-full">{rightBgSvg}</div>
      </div>

      <div className="absolute z-10 flex flex-col items-center">
        {mainImage}
        <p className="mt-4 text-xl font-bold text-white">{textValue}</p>
        <button className={`mt-6 px-6 py-2 rounded-lg ${joinButtonClass}`}>
          Join
        </button>
      </div>
    </div>
  );
};

export default ChooseSide;
