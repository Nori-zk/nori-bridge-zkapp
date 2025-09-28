"use client";

import ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";

let singleton: ZkappMintWorkerClient | null = null;

export default function getWorkerClient() {
  if (typeof window === "undefined") {
    return undefined as unknown as ZkappMintWorkerClient;
  }
  if (!singleton) {
    singleton = new ZkappMintWorkerClient();
  }
  return singleton;
}
