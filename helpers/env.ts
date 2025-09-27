"use client";
import { env } from "@nori-zk/mina-token-bridge/env";
const environment = "staging";
const envConfig = env[environment]!;
envConfig.NORI_TOKEN_BRIDGE_ADDRESS = "0x716e124a864a466814C29e55A898f7F005B0Cd46"
export default envConfig;