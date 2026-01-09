import { http } from "vimina";
import { devnet, mainnet } from "vimina/chains";
import { createConfig } from "wagmina";
import { getConnectors } from "@wagmina/core";

export const chain =
  process.env.NEXT_PUBLIC_CHAIN === "mainnet" ? mainnet : devnet;

export const config = createConfig({
  chains: [chain],
  transports: {
    [mainnet.id]: http(),
    [devnet.id]: http(),
  },
});

export function getWalletConnector(): ReturnType<typeof getConnectors>[number] {
  const connectors = getConnectors(config);
  const palladConnector = connectors.find((c) => c.id === "co.pallad");
  const selectedConnector =
    process.env.NEXT_PUBLIC_WALLET === "pallad" && palladConnector
      ? palladConnector
      : connectors.find((c) => c.id === "com.aurowallet");

  if (!selectedConnector) {
    throw new Error(
      "No suitable wallet connector found. Expected Pallad or Auro wallet connector to be available."
    );
  }

  return selectedConnector;
}
