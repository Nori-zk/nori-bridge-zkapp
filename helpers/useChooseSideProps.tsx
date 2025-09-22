import BlueBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightLeft.svg";
import BlueBackgroundLightRight from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightRight.svg";
import BlueBottomShadow from "@/public/assets/choose-side/backgrounds/BlueBottomShadow.svg";
import RedBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/RedBackgroundLightLeft.svg";
import RedBackgroundLightRight from "@/public/assets/choose-side/backgrounds/RedBackgroundLightRight.svg";
import RedBottomShadow from "@/public/assets/choose-side/backgrounds/RedBottomShadow.svg";
import GreenBackgroundLightRight from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightRight.svg";
import GreenBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightLeft.svg";
import GreenBottomShadow from "@/public/assets/choose-side/backgrounds/GreenBottomShadow.svg";
import RedSide from "@/public/assets/choose-side/images/RedSide.svg";
import BlueSide from "@/public/assets/choose-side/images/BlueSide.svg";
import GreenSide from "@/public/assets/choose-side/images/GreenSide.svg";
import { ChooseSideTypes } from "@/types/types.ts";

type ChooseSideUIProps = {
  radialBg: string;
  rightBgSvg: React.ReactNode;
  leftBgSvg: React.ReactNode;
  bottomShadowSvg: React.ReactNode;
  mainImage: React.ReactNode;
  textValue: string;
  joinButtonClass: string;
};

export function useChooseSideProps(side: ChooseSideTypes): ChooseSideUIProps {
  if (side === "red") {
    return {
      radialBg: "red",
      rightBgSvg: (
        <RedBackgroundLightRight className="absolute right-0 top-0 h-full w-1/2" />
      ),
      leftBgSvg: (
        <RedBackgroundLightLeft className="absolute left-0 top-0 h-full w-1/2" />
      ),
      bottomShadowSvg: <RedBottomShadow className="bottom-0 w-full" />,
      mainImage: <RedSide className="w-20 h-20" />,
      textValue: "370 Members",
      joinButtonClass: "bg-red-500 hover:bg-blue-600 text-white",
    };
  } else if (side === "green") {
    return {
      radialBg: "green",
      rightBgSvg: (
        <GreenBackgroundLightRight className="right-0 top-0 h-full" />
      ),
      leftBgSvg: <GreenBackgroundLightLeft className="left-0 top-0 h-full" />,
      bottomShadowSvg: <GreenBottomShadow className="bottom-0 w-full" />,
      mainImage: <GreenSide className="w-35 h-35" />,
      textValue: "Join the green Side",
      joinButtonClass: "bg-red-500 hover:bg-red-600 text-white",
    };
  } else {
    return {
      radialBg: "blue",
      rightBgSvg: (
        <BlueBackgroundLightRight className="absolute right-0 top-0 h-full w-1/2" />
      ),
      leftBgSvg: (
        <BlueBackgroundLightLeft className="absolute left-0 top-0 h-full w-1/2" />
      ),
      bottomShadowSvg: <BlueBottomShadow className=" bottom-0 w-full" />,
      mainImage: <BlueSide className="w-35 h-35" />,
      textValue: "160 Members",
      joinButtonClass: "bg-red-500 hover:bg-red-600 text-white",
    };
  }
}
