import BlueBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightLeft.svg";
import BlueBackgroundLightRight from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightRight.svg";
import RedBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/RedBackgroundLightLeft.svg";
import RedBackgroundLightRight from "@/public/assets/choose-side/backgrounds/RedBackgroundLightRight.svg";
import GreenBackgroundLightRight from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightRight.svg";
import GreenBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightLeft.svg";
import RedSide from "@/public/assets/choose-side/images/RedSide.svg";
import BlueSide from "@/public/assets/choose-side/images/BlueSide.svg";
import GreenSide from "@/public/assets/choose-side/images/GreenSide.svg";
import { ChooseSideTypes } from "@/types/types.ts";

type ChooseSideUIProps = {
  radialBg: string;
  rightBgSvg: React.ReactNode;
  leftBgSvg: React.ReactNode;
  mainImage: React.ReactNode;
  textValue: string;
  joinButtonClass: string;
};

export function useChooseSideProps(side: ChooseSideTypes): ChooseSideUIProps {
  if (side === "red") {
    return {
      radialBg: "bg-black",
      rightBgSvg: (
        <RedBackgroundLightRight className="absolute right-0 top-0 h-full w-1/2" />
      ),
      leftBgSvg: (
        <RedBackgroundLightLeft className="absolute left-0 top-0 h-full w-1/2" />
      ),
      mainImage: <RedSide className="w-20 h-20" />,
      textValue: "Join the Red Side",
      joinButtonClass: "bg-blue-500 hover:bg-blue-600 text-white",
    };
  } else if (side === "green") {
    return {
      radialBg: "bg-black",
      rightBgSvg: (
        <GreenBackgroundLightRight className="absolute right-0 top-0 h-full w-1/2" />
      ),
      leftBgSvg: (
        <GreenBackgroundLightLeft className="absolute left-0 top-0 h-full w-1/2" />
      ),
      mainImage: <GreenSide className="w-35 h-35" />,
      textValue: "Join the green Side",
      joinButtonClass: "bg-red-500 hover:bg-red-600 text-white",
    };
  } else {
    return {
      radialBg: "bg-black",
      rightBgSvg: (
        <BlueBackgroundLightRight className="absolute right-0 top-0 h-full w-1/2" />
      ),
      leftBgSvg: (
        <BlueBackgroundLightLeft className="absolute left-0 top-0 h-full w-1/2" />
      ),
      mainImage: <BlueSide className="w-35 h-35" />,
      textValue: "Join the green Side",
      joinButtonClass: "bg-red-500 hover:bg-red-600 text-white",
    };
  }
}
