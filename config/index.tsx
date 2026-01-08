import { http } from "vimina";
import { devnet, mainnet } from "vimina/chains";
import { createConfig } from "wagmina";
import { getConnectors } from "@wagmina/core";

export const chain = process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? mainnet : devnet;

export const config = createConfig({
  chains: [chain],
  transports: {
    [mainnet.id]: http(),
    [devnet.id]: http(),
  },
});

export function getWalletConnector() {
  const connectors = getConnectors(config);
  const palladConnector = connectors.find((c) => c.id === "co.pallad");
  return (process.env.NEXT_PUBLIC_WALLET === "pallad" && palladConnector)
      ? palladConnector
      : connectors.find((c) => c.id === "com.aurowallet");
}
