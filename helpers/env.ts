"use client";
import { env } from "@nori-zk/mina-token-bridge/env";
const environment = "staging";
const envConfig = {
  ...env[environment]!,
  MINA_RPC_NETWORK_URL:
    process.env.NEXT_PUBLIC_MINA_RPC_NETWORK_URL ??
    env[environment]!.MINA_RPC_NETWORK_URL,
};
export default envConfig;
