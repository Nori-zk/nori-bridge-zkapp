import { fromObservable, ObservableSnapshot, SnapshotEvent } from "xstate";
import {
  BridgeDepositProcessingStatus,
  //getDepositProcessingStatus$,
} from "@nori-zk/mina-token-bridge/rx/deposit";
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
import { type DepositMintContext } from "../DepositMintMachine.ts";
import {
  KeyTransitionStageMessageTypes,
  TransitionNoticeMessageType,
} from "@nori-zk/pts-types";
import { getDepositProcessingStatus$ } from "../obs/getDepositProcessingStatus$.ts";

// Get deposit processing status
// This state is responsible for driving the triggers (aka logic such as canMint and canCompute)
export function getDepositProcessingStatus(context: DepositMintContext) {
  return getDepositProcessingStatus$(
    context.activeDepositNumber!,
    context.ethStateTopic$,
    context.bridgeStateTopic$,
    context.bridgeTimingsTopic$
  ).pipe(
    map((status) => {
      const { deposit_processing_status } = status;
      if (
        deposit_processing_status ===
        BridgeDepositProcessingStatus.MissedMintingOpportunity
      ) {
        status.deposit_processing_status =
          BridgeDepositProcessingStatus.ReadyToMint;
      }
      return status;
    })
  );
}

// This new replacement is so we can rename system event names with user friend names.....

export enum ReplacementStageName {
  ProvingLightClient = "Proving light client inside zkVM",
  VerifyingZkVMProof = "Verifying zkVM proof in o1js",
  SettlingProof = "Settling proof on Mina",
  WaitingForConfirmation = "Waiting for Mina confirmation",
}

export const ReplacementStageNameValues = Object.values(ReplacementStageName);

const replacementNamesMap: Record<KeyTransitionStageMessageTypes, ReplacementStageName> = {
  [TransitionNoticeMessageType.BridgeHeadJobCreated]: ReplacementStageName.ProvingLightClient,
  [TransitionNoticeMessageType.BridgeHeadJobSucceeded]: ReplacementStageName.ProvingLightClient,
  [TransitionNoticeMessageType.ProofConversionJobReceived]: ReplacementStageName.VerifyingZkVMProof,
  [TransitionNoticeMessageType.ProofConversionJobSucceeded]: ReplacementStageName.VerifyingZkVMProof,
  [TransitionNoticeMessageType.EthProcessorProofRequest]: ReplacementStageName.SettlingProof,
  [TransitionNoticeMessageType.EthProcessorProofSucceeded]: ReplacementStageName.SettlingProof,
  [TransitionNoticeMessageType.EthProcessorTransactionSubmitting]: ReplacementStageName.SettlingProof,
  [TransitionNoticeMessageType.EthProcessorTransactionSubmitSucceeded]: ReplacementStageName.WaitingForConfirmation,
  [TransitionNoticeMessageType.EthProcessorTransactionFinalizationSucceeded]: ReplacementStageName.WaitingForConfirmation,
};

export enum ReplacementDepositProcessingStatus {
  WaitingForEthFinality = "Waiting for Ethereum finality",
  WaitingForPreviousJobCompletion = "Processing previous deposits",
  WaitingForCurrentJobCompletion = "Processing your deposit",
  ReadyToMint = "Minting in progress",
  MissedMintingOpportunity = "Missed minting opportunity",
}

export const ReplacementDepositProcessingStatusValues = Object.values(ReplacementDepositProcessingStatus);

export const replacementDepositStatus: Record<
  BridgeDepositProcessingStatus, ReplacementDepositProcessingStatus
> = {
  [BridgeDepositProcessingStatus.WaitingForEthFinality]: ReplacementDepositProcessingStatus.WaitingForEthFinality,
  [BridgeDepositProcessingStatus.WaitingForPreviousJobCompletion]: ReplacementDepositProcessingStatus.WaitingForPreviousJobCompletion,
  [BridgeDepositProcessingStatus.WaitingForCurrentJobCompletion]: ReplacementDepositProcessingStatus.WaitingForCurrentJobCompletion,
  [BridgeDepositProcessingStatus.ReadyToMint]: ReplacementDepositProcessingStatus.ReadyToMint,
  [BridgeDepositProcessingStatus.MissedMintingOpportunity]: ReplacementDepositProcessingStatus.MissedMintingOpportunity,
};

export function getCompressedDepositProcessingStatus$(
  depositProcessingStatus$: ReturnType<typeof getDepositProcessingStatus>
) {
  return depositProcessingStatus$.pipe(
    map((status) => {
      const {
        stage_name,
        deposit_processing_status,
        // elapsed_sec,
        // time_remaining_sec,
      } = status;
      const newStage = replacementNamesMap[stage_name];
      const newStatus = replacementDepositStatus[deposit_processing_status];
      return {
        ...status,
        stage_name: newStage,
        deposit_processing_status: newStatus,
      };
    })
    // scan reduce.....
  );
}

// Compressed deposit processing actor types

export type CompressedDepositProcessingValue = ObservableValue<
  ReturnType<typeof getCompressedDepositProcessingStatus$>
>;

export type CompressedDepositProcessingInput = {
  compressedDepositProcessingStatus$: ReturnType<
    typeof getCompressedDepositProcessingStatus$
  >;
};

export type CompressedDepositProcessingSnapshot = ObservableSnapshot<
  CompressedDepositProcessingValue,
  CompressedDepositProcessingInput
>;

export type CompressedDepositSnapshotEvent =
  SnapshotEvent<CompressedDepositProcessingSnapshot>;

export const compressedDepositProcessingStatusActor = fromObservable(
  ({
    input,
  }: {
    input: {
      compressedDepositProcessingStatus$: ReturnType<
        typeof getCompressedDepositProcessingStatus$
      >;
    };
  }) => {
    return input.compressedDepositProcessingStatus$;
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
        takeWhile((tick) => timeToWait - tick + 1 >= 0, true), // check me @jk
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
