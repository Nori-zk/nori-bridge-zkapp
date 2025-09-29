import BlueBottomShadow from "@/public/assets/choose-side/backgrounds/BlueBottomShadow.svg";
import RedBottomShadow from "@/public/assets/choose-side/backgrounds/RedBottomShadow.svg";
import GreenBackgroundLightRight from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightRight.svg";
import GreenBackgroundLightLeft from "@/public/assets/choose-side/backgrounds/GreenBackgroundLightLeft.svg";
import GreenBottomShadow from "@/public/assets/choose-side/backgrounds/GreenBottomShadow.svg";
import { ChooseSideTypes } from "@/types/types.ts";

type ChooseSideUIProps = {
  radialBg: string;
  rightBgSvg: React.ReactNode;
  leftBgSvg: React.ReactNode;
  bottomShadowSvg: React.ReactNode;
  mainImage: React.ReactNode;
  textValue: string;
  joinButtonBgClass: string;
  joinButtonTextClass: string;
  caption: string;
};

//TODO this should be fixed by moving assets into src
const NoriRed = "/assets/choose-side/images/NoriRed.png";
const NoriBlue = "/assets/choose-side/images/NoriBlue.png";
const NoriGreen = "/assets/choose-side/images/NoriGreen.png";
const BlueLeftLight = "/assets/choose-side/backgrounds/BlueLeftLight.png";
const BlueRightLight = "/assets/choose-side/backgrounds/BlueRightLight.png";
const RedRightLight = "/assets/choose-side/backgrounds/RedRightLight.png";
const RedLeftLight = "/assets/choose-side/backgrounds/RedLeftLight.png";

export function useChooseSideProps(side: ChooseSideTypes): ChooseSideUIProps {
  if (side === "red") {
    return {
      radialBg: "red",
      rightBgSvg: (
        <img
          src={RedRightLight}
          className="absolute right-0 top-0 h-full w-1/2"
        />
      ),
      leftBgSvg: (
        <img
          src={RedLeftLight}
          className="absolute left-0 top-0 h-full w-1/2"
        />
      ),
      bottomShadowSvg: <RedBottomShadow className="bottom-0 w-full" />,
      mainImage: (
        <img
          src={NoriRed}
          alt="Nori-Red-img"
          className="w-full h-auto rounded-lg shadow-md object-cover"
        />
      ),
      textValue: "370 Members",
      joinButtonBgClass: "red",
      joinButtonTextClass: "neonRed",
      caption:
        "The Yokai are ancient spirits, violently cast into our world during the cataclysm they call the Sundering. They consider all digital technology an unnatural 'corruption' that poisons their magic and sickens their very being. Their sole purpose is to purge this technological blight and restore a world where the raw power of nature and tradition reigns supreme.",
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
      caption:
        "Vindicated by the Great Collapse, the Cypherpunks are a leaderless collective of hackers who believe code is the only just law. They fight all forms of centralized authority to build a new reality that guarantees absolute individual freedom. Their world would be governed not by rulers, but by transparent, verifiable algorithms that place power directly in the hands of the people.",
    };
  } else {
    return {
      radialBg: "blue",
      rightBgSvg: (
        <img
          src={BlueRightLight}
          className="absolute right-0 top-0 h-full w-1/2"
        />
      ),
      leftBgSvg: (
        <img
          src={BlueLeftLight}
          className="absolute left-0 top-0 h-full w-1/2"
        />
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
      caption:
        "Rising from the chaos of the Great Collapse, the Kageyama Syndicate is a cybernetic Yakuza clan guided by a philosophy of absolute control. They view chaos and freedom as bugs to be fixed and seek to subjugate all other factions, not to destroy them, but to integrate their assets into a single, perfectly efficient, and profitable hierarchy under their command.",
    };
  }
}
