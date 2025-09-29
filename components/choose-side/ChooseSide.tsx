"use client";
import { useEffect, useState } from "react";
import { ChooseSideTypes } from "@/types/types.ts";
import { useChooseSideProps } from "@/helpers/useChooseSideProps.tsx";
import { Store } from "@/helpers/localStorage2.ts";
import { db, auth } from "@/config/firebaseConfig.ts";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseMintFunction } from "@/helpers/firebaseMint.ts";

type ChooseSideProps = {
  side: ChooseSideTypes;
  text: string
};

const updateUserRole = async (role: string) => {
  const user = auth.currentUser;
  if (!user) {
    console.error("No logged-in user");
    return;
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        role,
        lastRoleUpdate: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("User role updated in Firestore:", role);
  } catch (err) {
    console.error("Failed to update role:", err);
  }
};

const ChooseSide = ({ side, text }: ChooseSideProps) => {
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentClanRole, setCurrentClanRole] = useState<string | null>(null);

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
    blue: "role1",
    green: "role2",
    red: "role3",
  };
  const role = roleMap[radialBg];

  // Subscribe to user role updates in Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setCurrentClanRole(data?.role || null);
    });

    return () => unsubscribe();
  }, []);

  const buttonText = currentClanRole === role ? "Claim" : "Join";
  const isDimmed = currentClanRole !== null && currentClanRole !== role;

  const handleJoinClick = async () => {
    // If the user is logged in
    if (Store.global().firebaseLoggedIn) {
      // We can just swap the role straight away
      try {
        await updateUserRole(role);
        console.log("Role updated successfully");
      } catch (err) {
        console.error("Failed to update role:", err);
      }
    } else {
      const state = Array.from(crypto.getRandomValues(new Uint32Array(20)))
        .map(
          (x) =>
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[
              x % 62
            ]
        )
        .join("");
      window.location.href = `https://app.nori-zk.com/discord/start?state=${state}&role=${role}`;
    }
  };

  // Show loading state while processing Discord auth
  // As they redirect this wont be useful to them
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Granting Discord role...</p>
          <p className="text-gray-400 mt-2">
            Please wait while we process your request
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-choose-side-${radialBg} h-screen relative bg-cover bg-no-repeat flex items-center justify-center border border-transparent hover:border-glow-${joinButtonBgClass} transition-all ${
        isDimmed ? "opacity-60" : ""
      }`} // CHANGE MADE
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      onClick={()=>firebaseMintFunction(123.00,4321,"codeChallengeNew")} // REMOVEME FIXME BUG this is just for testing remove it!
    >
      <div className="absolute inset-0 flex">
        <div className="h-full w-1/2">{leftBgSvg}</div>
        <div className="h-full w-1/2">{rightBgSvg}</div>
      </div>

      <div className="grid grid-rows-5 h-full relative z-10 w-full max-w-4xl mx-auto">
        <div className="flex h-full">
          {hovered && (
            <div className="flex h-full w-full px-10 items-end text-white">
              {text}
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
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseSide;
