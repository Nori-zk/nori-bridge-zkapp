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
      depositProcessingStatus$: ReturnType<typeof getDepositProcessingStatus$>;
    };
  }) => {
    return getCanComputeEthProof$(input.depositProcessingStatus$);
  }
);

export const canMintActor = fromObservable(
  ({
    input,
  }: {
    input: {
      depositProcessingStatus$: ReturnType<typeof getDepositProcessingStatus$>;
    };
  }) => {
    return getCanMint$(input.depositProcessingStatus$);
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
