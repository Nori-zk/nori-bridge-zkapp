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
    bottomShadowSvg,
    mainImage,
    textValue,
    joinButtonClass,
  } = useChooseSideProps(side);

  return (
    <div
      className={`bg-choose-side-${radialBg} h-screen relative bg-cover bg-no-repeat`}
    >
      <div className="absolute inset-0 flex">
        <div className="h-full w-1/2">{leftBgSvg}</div>
        <div className="h-full w-1/2">{rightBgSvg}</div>
      </div>

      <div className="grid grid-rows-5 h-full relative z-10 w-full">
        <div></div>
        <div className="flex flex-col row-span-3 items-center w-full justify-center">
          {mainImage}
          <div>{bottomShadowSvg}</div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="text-2xl font-normal text-white">{textValue}</p>
          <button className={`mt-6 w-1/3 py-2 rounded-lg ${joinButtonClass}`}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseSide;
