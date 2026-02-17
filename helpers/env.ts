'use client';
import { env } from '@nori-zk/mina-token-bridge/env';

// We should have real environment variables for these to keep the client flexable
const network = 'mina' as const;
const environment = 'staging' as const;

const envConfig = env[network]![environment]!;
export default envConfig;
