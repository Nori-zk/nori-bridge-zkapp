// Note move this file back to the sdk if it works
import { BridgeDepositProcessingStatus } from "@nori-zk/mina-token-bridge/rx/deposit";
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  KeyTransitionStageMessageTypes,
  TransitionNoticeMessageType,
} from "@nori-zk/pts-types";
import {
  combineLatest,
  concat,
  distinctUntilChanged,
  interval,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  takeWhile,
} from "rxjs";

function stageIndex(stage: TransitionNoticeMessageType) {
  return KeyTransitionStageMessageTypes.indexOf(
    stage as unknown as KeyTransitionStageMessageTypes
  ); // Could be absent
}

// Index of key stages

// At this stage if our deposit was in the last window it is unsafe to mint as Eth processor's storage root would be inconsistent.
const stageIndexEthProcessorTransactionSubmitSucceeded = stageIndex(
  TransitionNoticeMessageType.EthProcessorTransactionSubmitSucceeded
);

const timingsStatsMap: Record<KeyTransitionStageMessageTypes, number> = {
  [TransitionNoticeMessageType.BridgeHeadJobCreated]: 170,
  [TransitionNoticeMessageType.BridgeHeadJobSucceeded]: 0,
  [TransitionNoticeMessageType.ProofConversionJobReceived]: 320,
  [TransitionNoticeMessageType.ProofConversionJobSucceeded]: 0,
  [TransitionNoticeMessageType.EthProcessorProofRequest]: 48,
  [TransitionNoticeMessageType.EthProcessorProofSucceeded]: 0,
  [TransitionNoticeMessageType.EthProcessorTransactionSubmitting]: 36,
  [TransitionNoticeMessageType.EthProcessorTransactionSubmitSucceeded]: 560, // chance every 3min in theory
  [TransitionNoticeMessageType.EthProcessorTransactionFinalizationSucceeded]: 0
};

/**
 * Monitors the status of a bridge deposit and emits a stream of updates regarding its processing state.
 *
 * The stream emits objects containing the current bridge state, estimated time remaining, elapsed time,
 * deposit processing status, and the original deposit block number. It transitions through various statuses such as
 * WaitingForEthFinality, WaitingForCurrentJobCompletion, ReadyToMint, or MissedMintingOpportunity.
 *
 * The observable completes once the deposit is considered a missed minting opportunity.
 *
 * @param depositBlockNumber     The block number in which the deposit occurred.
 * @param ethStateTopic$         Observable stream of Ethereum finality data.
 * @param bridgeStateTopic$      Observable stream of the bridge state machine.
 * @param bridgeTimingsTopic$    Observable stream of bridge timing configuration.
 * @returns An observable emitting periodic updates about the deposit's processing status.
 */
export const getDepositProcessingStatus$ = (
  depositBlockNumber: number,
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>,
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>,
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>
) => {
  // base ticker
  const tick$ = interval(1000).pipe(startWith(0));

  // Only react when bridgeState actually changes:
  const combinedBridge$ = combineLatest([
    bridgeStateTopic$,
    bridgeTimingsTopic$,
  ]).pipe(
    distinctUntilChanged(
      (prev, curr) => JSON.stringify(prev[0]) === JSON.stringify(curr[0])
    )
  );

  // Combine ethState with that, but once we're past finality waiting,
  // ignore ethState only updates:
  const trigger$ = combineLatest([ethStateTopic$, combinedBridge$, tick$]).pipe(
    distinctUntilChanged((prev, curr) => {
      const [prevEth, [prevBridge, prevTimings], prevTick] = prev;
      const [currEth, [currBridge, currTimings], currTick] = curr;

      const wasWaiting =
        prevEth.latest_finality_block_number < depositBlockNumber;
      const isWaiting =
        currEth.latest_finality_block_number < depositBlockNumber;

      // if we’ve left “waiting” mode, ignore eth-only changes:
      if (!isWaiting && !wasWaiting) {
        return (
          JSON.stringify(prevBridge) === JSON.stringify(currBridge) &&
          JSON.stringify(prevTimings) === JSON.stringify(currTimings)
        );
      }

      // suppress if the only thing that changed is the tick
      const bridgeUnchanged =
        JSON.stringify(prevBridge) === JSON.stringify(currBridge);
      const timingsUnchanged =
        JSON.stringify(prevTimings) === JSON.stringify(currTimings);
      const ethUnchanged = JSON.stringify(prevEth) === JSON.stringify(currEth);

      const onlyTickChanged =
        bridgeUnchanged &&
        timingsUnchanged &&
        ethUnchanged &&
        prevTick !== currTick;

      if (onlyTickChanged) return true; // suppress

      // otherwise (during waiting or on transition) always fire
      return false;
    })
  );

  // On each trigger, do one time / status computation and then switch to a single interval:
  const status$ = trigger$.pipe(
    map(([ethState, [bridgeState, bridgeTimings], tick]) => {
      // Determine status
      let status: BridgeDepositProcessingStatus;

      // Extract bridgeState properties
      const {
        stage_name,
        elapsed_sec,
        input_block_number,
        output_block_number,
      } = bridgeState;

      if (ethState.latest_finality_block_number < depositBlockNumber) {
        status = BridgeDepositProcessingStatus.WaitingForEthFinality;
      } else {
        if (
          input_block_number <= depositBlockNumber &&
          depositBlockNumber <= output_block_number
        ) {
          if (
            stage_name ===
            TransitionNoticeMessageType.EthProcessorTransactionFinalizationSucceeded
          )
            status = BridgeDepositProcessingStatus.ReadyToMint;
          else
            status =
              BridgeDepositProcessingStatus.WaitingForCurrentJobCompletion;
        } else if (output_block_number < depositBlockNumber) {
          status =
            BridgeDepositProcessingStatus.WaitingForPreviousJobCompletion;
        } else {
          // if (despositBlockNumber < input_block_number)
          // Here we might still be ready to mint if our last finalized job includes our deposit in its window
          // AND the current job has not reached TransitionNoticeMessageType.EthProcessorTransactionSubmitSucceeded
          if (bridgeState.last_finalized_job === "unknown") {
            // Due to a server restart we don't know what our last finalized job was we can only assume that
            // we missed our minting opportunity.
            status = BridgeDepositProcessingStatus.MissedMintingOpportunity;
          } else {
            const {
              input_block_number: last_input_block_number,
              output_block_number: last_output_block_number,
            } = bridgeState.last_finalized_job;

            const stageIdx = stageIndex(stage_name);

            // If the deposit was in the last finalized job window and the current job has not been submitted to mina then we can still mint
            if (
              last_input_block_number <= depositBlockNumber &&
              depositBlockNumber <= last_output_block_number &&
              stageIdx < stageIndexEthProcessorTransactionSubmitSucceeded
            ) {
              status = BridgeDepositProcessingStatus.ReadyToMint;
            } else {
              status = BridgeDepositProcessingStatus.MissedMintingOpportunity;
            }
          }
        }
      }

      // Do time estimate computation
      let timeToWait: number;
      //Maybe useful later
      // let lastKnownExpected: number;

      if (status === BridgeDepositProcessingStatus.WaitingForEthFinality) {
        const delta =
          ethState.latest_finality_slot - ethState.latest_finality_block_number;
        const depositSlot = depositBlockNumber + delta;
        const rounded = Math.ceil(depositSlot / 32) * 32;
        const blocksRemaining =
          rounded - delta - ethState.latest_finality_block_number;
        timeToWait = Math.max(0, blocksRemaining * 12) + tick;
      } else {
        // put custom rules here for the network timed pieces  ***********************
        // @Karol
        const expected = timingsStatsMap[stage_name] ?? 0;//bridgeTimings.extension[stage_name] ?? 15;
        // lastKnownExpected = bridgeTimings.extension[stage_name]; 
        timeToWait = expected - elapsed_sec;
      }

      const elapsed =
        status === BridgeDepositProcessingStatus.WaitingForEthFinality
          ? tick
          : elapsed_sec;

      return { status, bridgeState, timeToWait, elapsed };
    }),
    // Complete if we have MissedMintingOpportunity
    takeWhile(
      ({ status }) =>
        status !== BridgeDepositProcessingStatus.MissedMintingOpportunity,
      true
    )
  );

  return status$.pipe(
    switchMap(({ status, bridgeState, timeToWait, elapsed }) => {
      return concat(
        of(0), // emit immediately
        interval(1000) // then every 1s
      ).pipe(
        // Complete if we have MissedMintingOpportunity
        takeWhile(
          () =>
            status !== BridgeDepositProcessingStatus.MissedMintingOpportunity,
          true
        ),
        // Calculate timeRemaining
        map((tick) => {
          // elapsed counting logic
          const totalElapsed =
            status === BridgeDepositProcessingStatus.WaitingForEthFinality
              ? elapsed + tick // keep counting with tick
              : tick; // otherwise just use interval tick

          let timeRemaining = timeToWait - totalElapsed + 1;
          if (
            bridgeState.stage_name ===
            TransitionNoticeMessageType.EthProcessorTransactionFinalizationSucceeded &&
            status !== BridgeDepositProcessingStatus.WaitingForEthFinality
          ) {
            timeRemaining = ((timeRemaining % 384) + 384) % 384;
          }
          return {
            ...bridgeState,
            time_remaining_sec: timeRemaining,
            elapsed_sec: totalElapsed,
            deposit_processing_status: status,
            deposit_block_number: depositBlockNumber,

          };
        })
      );
    }),
    shareReplay(1)
  );
};
