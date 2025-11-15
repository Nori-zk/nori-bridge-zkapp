"use client";
import { env } from "@nori-zk/mina-token-bridge/env";
const environment = "staging";
const envConfig = env[environment]!;
envConfig.MINA_RPC_NETWORK_URL = 'https://mina-node.devnet.nori.it.com/graphql'
export default envConfig;