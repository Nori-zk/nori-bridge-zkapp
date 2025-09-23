"use client";
import { fromObservable } from "xstate";
import {
  catchError,
  filter,
  first,
  from,
  interval,
  of,
  startWith,
  switchMap,
} from "rxjs";
import {
  type getBridgeStateTopic$,
  type getBridgeTimingsTopic$,
  type getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  getDepositProcessingStatus$,
  getCanMint$,
  getCanComputeEthProof$,
} from "@nori-zk/mina-token-bridge/rx/deposit";
import type ZkappMintWorkerClient from "@/workers/mintWorkerClient.ts";

export const canComputeEthProofActor = fromObservable(
  ({
    input,
  }: {
    input: {
      depositBlockNumber: number;
      ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
      bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
      bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
    };
  }) => {
    return getCanComputeEthProof$(
      getDepositProcessingStatus$(
        input.depositBlockNumber,
        input.ethStateTopic$,
        input.bridgeStateTopic$,
        input.bridgeTimingsTopic$
      )
    );
  }
);

export const canMintActor = fromObservable(
  ({
    input,
  }: {
    input: {
      depositBlockNumber: number;
      ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
      bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
      bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
    };
  }) => {
    return getCanMint$(
      getDepositProcessingStatus$(
        input.depositBlockNumber,
        input.ethStateTopic$,
        input.bridgeStateTopic$,
        input.bridgeTimingsTopic$
      )
    );
  }
);

export const storageIsSetupWithDelayActor = fromObservable(
  ({
    input,
  }: {
    input: {
      worker: ZkappMintWorkerClient;
    };
  }) => {
    const period = 1000;
    return interval(period).pipe(
      startWith(0), // check immediately
      switchMap(() => from(input.worker.needsToSetupStorage())),
      catchError(() => of(true)), // on error treat as "still needs setup" and keep polling
      filter((needsSetup) => !needsSetup),
      first() // emits `false` then completes
    );
  }
);
