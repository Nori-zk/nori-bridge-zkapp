'use client';

import envConfig from '@/helpers/env.ts';

const { NORI_WSS_URL: noriWssUrl } = envConfig;
// lazy storage
let socketSingleton: WebSocket | null = null;

export function getScrollingWSSSocketSingleton(): WebSocket {
  if (typeof window === 'undefined') {
    console.log('Suppressing ScrollingWSSSocketSingleton on server');
    return undefined as unknown as WebSocket;
  }

  if (!socketSingleton) {
    console.log('Constructing scrollingWSSSocket (client runtime)');
    socketSingleton = new WebSocket(noriWssUrl);
  }

  return socketSingleton;
}
