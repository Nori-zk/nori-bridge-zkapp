"use client";
import Image from "next/image";
import Mina from "@/public/assets/mina.svg";
import Ethereum from "@/public/assets/Ethereum.svg";

type WalletButtonTypes = "Mina" | "Ethereum";

export type MinaButtonProps = {
  types: WalletButtonTypes;
  onClick?: () => void;
  content: string;
  width?: number;
};

const WalletButton = ({ types, onClick, content, width }: MinaButtonProps) => {
  return (
    <button
      style={{ width }}
      className="flex bg-white rounded-lg text-black px-4 py-2 items-center justify-evenly"
      onClick={onClick}
    >
      {types === "Mina" && <Image src={Mina} alt={"MinaSVG"} height={20} />}
      {types === "Ethereum" && (
        <Image src={Ethereum} alt={"EthereumSVG"} height={20} />
      )}
      {content}
    </button>
  );
};

export default WalletButton;
