import BlueBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightLeft.svg";
import BlueBackgroundLightRight from "@/public/assets/choose-side/backgrounds/BlueBackgroundLightRight.svg";
import BlueBottomShadow from "@/public/assets/choose-side/backgrounds/BlueBottomShadow.svg";
import RedBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/RedBackgroundLightLeft.svg";
import RedBackgroundLightRight from "@/public/assets/choose-side/backgrounds/RedBackgroundLightRight.svg";
import RedBottomShadow from "@/public/assets/choose-side/backgrounds/RedBottomShadow.svg";
import GreenBackgroundLightRight from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightRight.svg";
import GreenBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightLeft.svg";
import GreenBottomShadow from "@/public/assets/choose-side/backgrounds/GreenBottomShadow.svg";
import { ChooseSideTypes } from "@/types/types.ts";

type ChooseSideUIProps = {
  radialBg: 'blue' | 'green' | 'red';
  rightBgSvg: React.ReactNode;
  leftBgSvg: React.ReactNode;
  bottomShadowSvg: React.ReactNode;
  mainImage: React.ReactNode;
  textValue: string;
  joinButtonBgClass: string;
  joinButtonTextClass: string;
};

//TODO this should be fixed by moving assets into src
const NoriRed = "/assets/choose-side/images/NoriRed.png";
const NoriBlue = "/assets/choose-side/images/NoriBlue.png";
const NoriGreen = "/assets/choose-side/images/NoriGreen.png";

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
      mainImage: (
        //using inline styles to control size as svg import not responding to tailwind width/height classes
        // <div style={{ width: "60%", height: "80%" }}>
        //   <Image src />
        // </div>
        <img
          src={NoriRed}
          alt="Nori-Red-img"
          className="w-full h-auto rounded-lg shadow-md object-cover"
        />
      ),
      textValue: "370 Members",
      joinButtonBgClass: "red",
      joinButtonTextClass: "neonRed",
    };
  } else if (side === "green") {
    return {
      radialBg: "green",
      rightBgSvg: (
        <GreenBackgroundLightRight className="right-0 top-0 h-full" />
      ),
      leftBgSvg: <GreenBackgroundLightLeft className="left-0 top-0 h-full" />,
      bottomShadowSvg: <GreenBottomShadow className="bottom-0 w-full" />,
      mainImage: (
        <img
          src={NoriGreen}
          alt="Nori-Green-img"
          className="w-full h-auto rounded-lg shadow-md object-cover"
        />
      ),
      textValue: "210 Members",
      joinButtonBgClass: "green",
      joinButtonTextClass: "neonGreen",
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
      mainImage: (
        <img
          src={NoriBlue}
          alt="Nori-Bue-img"
          className="w-full h-auto rounded-lg shadow-md object-cover"
        />
      ),
      textValue: "160 Members",
      joinButtonBgClass: "blue",
      joinButtonTextClass: "neonBlue",
    };
  }
}
