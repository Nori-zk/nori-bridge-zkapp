"use client";

const WSS_URL = "wss://wss.nori.it.com/";

// lazy storage
let socketSingleton: WebSocket | null = null;

export function getScrollingWSSSocketSingleton(): WebSocket {
  if (typeof window === "undefined") {
    console.log('Suppressing ScrollingWSSSocketSingleton on server');
    return undefined as unknown as WebSocket;
  }

  if (!socketSingleton) {
    console.log("Constructing scrollingWSSSocket (client runtime)");
    socketSingleton = new WebSocket(WSS_URL);
  }

  return socketSingleton;
}
