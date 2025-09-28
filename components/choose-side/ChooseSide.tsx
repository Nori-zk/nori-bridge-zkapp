"use client";
import { useState, useEffect } from "react";
import { ChooseSideTypes } from "@/types/types.ts";
import { useChooseSideProps } from "@/helpers/useChooseSideProps.tsx";

type ChooseSideProps = {
  side: ChooseSideTypes;
};

const ChooseSide = ({ side }: ChooseSideProps) => {
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const roleMap = {
    'blue': 'role1',
    'green': 'role2',
    'red': 'role3'
  };
  const role = roleMap[radialBg];

  const handleJoinClick = () => {
    const state = Array.from(crypto.getRandomValues(new Uint32Array(20))).map(x => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[x % 62]).join("");
    window.location.href = `https://sliced-56cbd.firebaseapp.com/discord/start?state=${state}&role=${role}`;
  };

  // Show loading state while processing Discord auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Granting Discord role...</p>
          <p className="text-gray-400 mt-2">Please wait while we process your request</p>
        </div>
      </div>
    );
  }

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
          <div className="w-3/4">{mainImage}</div>
          <div>{bottomShadowSvg}</div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          <p
            className={`text-2xl text-${joinButtonTextClass} text-glow-neon-${joinButtonBgClass}`}
          >
            {textValue}
          </p>
          <button
            onClick={handleJoinClick}
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