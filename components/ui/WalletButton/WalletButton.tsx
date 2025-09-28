"use client";
import { useWalletButtonProps } from "@/helpers/useWalletButtonProps.tsx";
import { WalletButtonTypes } from "@/types/types.ts";
import clsx from "clsx";
import { useState, useEffect } from "react";

export type WalletButtonProps = {
  id: string;
  types: WalletButtonTypes;
  onClick?: () => void;
  content?: string;
  width?: number;
  height?: number;
};

const WalletButton = ({
  id,
  types,
  content = "Connect Wallet",
  width = 250,
  height = 55,
  onClick,
}: WalletButtonProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const {
    bgClass,
    textClass,
    displayAddress,
    logo,
    onClick: hookOnClick,
    isConnecting,
    currency,
    transactionAmount,
    transactionTitle,
  } = useWalletButtonProps(types, content);

  //TODO this needs setting programmatically
  const isComplete = false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClick = onClick || hookOnClick;

  if (!isMounted) {
    return (
      <button
        data-testid={id}
        id={id}
        style={{ width, height }}
        onClick={handleClick}
        className={clsx(
          "px-4 py-2 rounded-lg flex items-center justify-evenly",
          "bg-white",
          "text-black"
        )}
      >
        {logo}
        {content}
      </button>
    );
  }

  return (
    <button
      data-testid={id}
      id={id}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width,
        height,
      }}
      onClick={handleClick}
      disabled={isConnecting}
      className={clsx(
        "px-4 py-2 rounded-lg flex items-center justify-evenly",
        bgClass,
        textClass,
        isConnecting && "opacity-50 cursor-not-allowed"
      )}
    >
      {isComplete ? (
        <>
          <div className="flex w-full flex-col">
            <div className="flex justify-start text-xs text-white/50">
              {transactionTitle}
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center justify-between">
                <div className="scale-[0.95]">{logo}</div>
                <div className="m-1 text-sm">{displayAddress}</div>
              </div>
              <div className="text-sm">{`${transactionAmount} ${currency}`}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="m-1">{logo}</div>
          <div className="m-3 text-lg">{displayAddress}</div>
        </>
      )}
    </button>
  );
};

export default WalletButton;
