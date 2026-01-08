"use client";
import { shareReplay } from "rxjs";
import { getReconnectingBridgeSocket$ } from "@nori-zk/mina-token-bridge/rx/socket";
import {
  getBridgeStateTopic$,
  getBridgeTimingsTopic$,
  getEthStateTopic$,
} from "@nori-zk/mina-token-bridge/rx/topics";

export interface BridgeSocket {
  bridgeSocket$: ReturnType<typeof getReconnectingBridgeSocket$>["bridgeSocket$"];
  bridgeSocketConnectionState$: ReturnType<
    typeof getReconnectingBridgeSocket$
  >["bridgeSocketConnectionState$"];
  ethStateTopic$: ReturnType<typeof getEthStateTopic$>;
  bridgeStateTopic$: ReturnType<typeof getBridgeStateTopic$>;
  bridgeTimingsTopic$: ReturnType<typeof getBridgeTimingsTopic$>;
}

let singleton: BridgeSocket | null = null;

export default function getBridgeSocketSingleton(): BridgeSocket {
  if (singleton) return singleton;

  if (typeof window === "undefined") {
    console.log('Suppressing BridgeSocketSingleton on server');
    return {} as BridgeSocket; // coercing type for server
  }

  console.log("Constructing reconnecting bridge socket");

  const { bridgeSocket$, bridgeSocketConnectionState$ } = getReconnectingBridgeSocket$();
  const ethStateTopic$ = getEthStateTopic$(bridgeSocket$).pipe(shareReplay(1));
  const bridgeStateTopic$ = getBridgeStateTopic$(bridgeSocket$).pipe(shareReplay(1));
  const bridgeTimingsTopic$ = getBridgeTimingsTopic$(bridgeSocket$).pipe(shareReplay(1));

  // warm them up
  ethStateTopic$.subscribe();
  bridgeStateTopic$.subscribe();
  bridgeTimingsTopic$.subscribe();

  singleton = {
    bridgeSocket$,
    bridgeSocketConnectionState$,
    ethStateTopic$,
    bridgeStateTopic$,
    bridgeTimingsTopic$,
  };

  return singleton;
}