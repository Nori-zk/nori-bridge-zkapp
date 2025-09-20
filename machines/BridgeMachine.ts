import { assign, setup } from "xstate";
import { getBridgeStageWithCountdownActor } from "@/machines/actors/statuses.ts";
import {
  type TransitionNoticeMessageType,
  KeyTransitionStageMessageTypes,
} from "@nori-zk/pts-types";
import {
  type getBridgeStateTopic$,
  type getBridgeTimingsTopic$,
  type getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";
import {
  BridgeStageSnapshotEvent,
  BridgeStageValue,
} from "@/machines/actors/statuses.ts";

type BridgeStageContext = {
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
  bridgeStatus: BridgeStageValue | null;
};

export type BridgeStageEvents = {
  type: "STAGE_UPDATE";
  stage: TransitionNoticeMessageType;
};

export type BridgeStates = KeyTransitionStageMessageTypes;

// This invoke entry will update the machine context when the deposit status changes can be used in any node.
const invokeMonitoringBridgeStatus = {
  id: "bridgeStatus",
  src: "getBridgeStageWithCountdownActor" as const,
  input: ({ context }: { context: BridgeStageContext }) =>
    ({
      bridgeStateTopic$: context.bridgeStateTopic$!,
      bridgeTimingsTopic$: context.bridgeTimingsTopic$!,
    } as const),
  onSnapshot: {
    actions: assign<
      BridgeStageContext,
      BridgeStageSnapshotEvent,
      undefined,
      BridgeStageEvents,
      never
    >({
      bridgeStatus: ({ event }) => {
        return event.snapshot.context ?? null;
      },
    }),
  } as const,
};

export function getBridgeMachine(
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>,
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>
) {
  const allGuards = KeyTransitionStageMessageTypes.map((nextStage) => ({
    target: nextStage,
    guard: ({ context }: { context: BridgeStageContext }) =>
      context.bridgeStatus?.stage_name === nextStage,
  }));

  // Build states for each KeyTransitionStageMessageTypes
  const states = KeyTransitionStageMessageTypes.reduce((acc, stage) => {
    acc[stage] = {
      invoke: invokeMonitoringBridgeStatus,
      always: allGuards.filter((g) => g.target !== stage), // exclude self
    };
    return acc;
  }, {} as Record<string, any>);

  states.monitoring = {
    invoke: invokeMonitoringBridgeStatus,
    always: allGuards,
  };

  return setup({
    types: {
      context: {} as BridgeStageContext,
      events: {} as {
        type: "STAGE_UPDATE";
        stage: TransitionNoticeMessageType;
      },
    },
    actors: {
      getBridgeStageWithCountdownActor,
    },
  }).createMachine({
    id: "bridge",
    initial: "monitoring",

    context: {
      bridgeStateTopic$,
      bridgeTimingsTopic$,
      bridgeStatus: null,
    },

    states,
  });
}
