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

  const CLIENT_ID = '1421485970468901005';
  const REDIRECT_URI = encodeURIComponent(window.location.origin);

  const roleMap = {
    'blue': 'role1',
    'green': 'role2',
    'red': 'role3'
  };
  const role = roleMap[radialBg];

  // Handle Discord OAuth redirect on same page
  useEffect(() => {
    const handleDiscordCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const roleType = urlParams.get('state');

      // Only process if this component matches the role type from OAuth
      if (code && roleType && roleType === role) {
        setLoading(true);

        try {
          const response = await fetch('http://localhost:8090/auth/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, roleType })
          });

          const result = await response.json();

          if (result.success) {
            alert(`🎉 ${radialBg.toUpperCase()} role granted successfully!`);
          } else {
            alert('Error: ' + result.error);
          }
        } catch (error) {
          console.error('Authentication failed:', error);
          alert('Authentication failed. Please try again.');
        }

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setLoading(false);
      }
    };

    handleDiscordCallback();
  }, [role, radialBg]); // Add dependencies

  const handleJoinClick = () => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20guilds.join&state=${role}`;

    // Direct redirect to Discord OAuth
    window.location.href = discordAuthUrl;
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