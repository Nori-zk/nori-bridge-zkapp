import { fromObservable, ObservableSnapshot, SnapshotEvent } from "xstate";
import { getDepositProcessingStatus$ } from "@nori-zk/mina-token-bridge/rx/deposit";
import {
  type getBridgeStateTopic$,
  type getBridgeTimingsTopic$,
  type getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import { ObservableValue } from "../types.ts";
import {
  combineLatest,
  concat,
  interval,
  map,
  of,
  shareReplay,
  switchMap,
  takeWhile,
} from "rxjs";

// Deposit processing actor types
export type DepositProcessingValue = ObservableValue<
  ReturnType<typeof getDepositProcessingStatus$>
>;

export type DepositProcessingInput = {
  depositProcessingStatus$: ReturnType<typeof getDepositProcessingStatus$>;
};

export type DepositProcessingSnapshot = ObservableSnapshot<
  DepositProcessingValue,
  DepositProcessingInput
>;

export type DepositSnapshotEvent = SnapshotEvent<DepositProcessingSnapshot>;

export const depositProcessingStatusActor = fromObservable(
  ({
    input,
  }: {
    input: {
      depositProcessingStatus$: ReturnType<typeof getDepositProcessingStatus$>;
    };
  }) => {
    return input.depositProcessingStatus$;
  }
);

/**
 * Emits bridge state with countdown info (time remaining until next stage).
 *
 * @param bridgeStateTopic$   Observable of bridge state
 * @param bridgeTimingsTopic$ Observable of bridge timings
 */
const getBridgeStageWithCountdown$ = (
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>,
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>
) => {
  return combineLatest([bridgeStateTopic$, bridgeTimingsTopic$]).pipe(
    switchMap(([bridgeState, bridgeTimings]) => {
      const { stage_name, elapsed_sec } = bridgeState;

      // Look up expected stage duration (default 15s if missing)
      const expected = bridgeTimings.extension[stage_name] ?? 15;
      const timeToWait = expected - elapsed_sec;

      return concat(of(0), interval(1000)).pipe(
        takeWhile((tick) => timeToWait - tick + 1 >= 0, true),
        map((tick) => {
          const timeRemaining = timeToWait - tick + 1;
          return {
            ...bridgeState,
            time_remaining_sec: Math.max(0, timeRemaining),
            elapsed_sec: elapsed_sec + tick,
          };
        })
      );
    }),
    shareReplay(1)
  );
};

// Deposit processing actor types
export type BridgeStageValue = ObservableValue<
  ReturnType<typeof getBridgeStageWithCountdown$>
>;

export type BridgeStageInput = {
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
};

export type BridgeStageSnapshot = ObservableSnapshot<
  BridgeStageValue,
  BridgeStageInput
>;

export type BridgeStageSnapshotEvent = SnapshotEvent<BridgeStageSnapshot>;

export const getBridgeStageWithCountdownActor = fromObservable(
  ({
    input,
  }: {
    input: {
      bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
      bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
    };
  }) => {
    return getBridgeStageWithCountdown$(
      input.bridgeStateTopic$,
      input.bridgeTimingsTopic$
    );
  }
);
