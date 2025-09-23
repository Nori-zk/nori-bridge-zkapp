"client";
import { env } from "@nori-zk/mina-token-bridge";
const environment = "staging";
const envConfig = env[environment]!;
export default envConfig;