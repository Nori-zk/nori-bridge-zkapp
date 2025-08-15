import { TokenMintWorker } from "@nori-zk/mina-token-bridge/workers/defs";
import { WorkerChild } from '@nori-zk/mina-token-bridge/browser/worker/child';
import { createWorker } from '@nori-zk/mina-token-bridge/worker';
createWorker(new WorkerChild(), TokenMintWorker);