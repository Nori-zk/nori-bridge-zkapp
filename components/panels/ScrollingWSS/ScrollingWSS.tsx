"use client";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { noticeToText } from "@/helpers/textHelper.tsx";

const SOCKET_URL = "wss://wss.nori.it.com/";

// ---- Global socket registry (survives HMR) ----
type RegistryEntry = {
  ws: WebSocket;
  refs: number;
  subscribed: boolean; // have we sent initial subscribe messages for this ws yet?
};

declare global {
  interface Window {
    __WS_REGISTRY__?: Record<string, RegistryEntry>;
  }
}

function acquireSocket(url: string): {
  entry: RegistryEntry;
  release: () => void;
} {
  const g = (
    typeof window !== "undefined" ? window : (globalThis as any)
  ) as Window;
  if (!g.__WS_REGISTRY__) g.__WS_REGISTRY__ = {};

  let entry = g.__WS_REGISTRY__[url];

  if (!entry || entry.ws.readyState === WebSocket.CLOSED) {
    entry = {
      ws: new WebSocket(url),
      refs: 0,
      subscribed: false,
    };
    g.__WS_REGISTRY__[url] = entry;
  }

  entry.refs += 1;

  const release = () => {
    entry.refs -= 1;
    // Delay a bit so rapid unmount/mount during Fast Refresh doesn't flap
    setTimeout(() => {
      if (entry.refs <= 0) {
        try {
          entry.ws.close(1000, "no consumers");
        } catch {}
        delete g.__WS_REGISTRY__![url];
      }
    }, 1000);
  };

  return { entry, release };
}

export default function ScrollingWSS() {
  const [messageLines, setMessageLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const resolverRef = useRef(Promise.resolve());
  const releaseRef = useRef<() => void>(() => {});

  const addText = (text: string) => {
    resolverRef.current = resolverRef.current.then(() => _addText(text));
  };

  const _addText = async (text: string) => {
    setMessageLines((prev) => ["", ...prev]);
    for (let i = 0; i < text.length; i++) {
      await new Promise((r) => setTimeout(r, 0));
      setMessageLines((prev) => {
        const next = [...prev];
        next[0] = text.slice(0, i + 1);
        return next.slice(0, 20);
      });
    }
  };

  useEffect(() => {
    const { entry, release } = acquireSocket(SOCKET_URL);
    releaseRef.current = release;
    const socket = entry.ws;

    const onOpen = () => {
      setConnected(true);

      // Send subscriptions **once per underlying socket**
      if (!entry.subscribed) {
        socket.send(
          JSON.stringify({ method: "subscribe", topic: "notices.system.*" })
        );
        socket.send(
          JSON.stringify({ method: "subscribe", topic: "notices.transition.*" })
        );
        entry.subscribed = true;
      }
    };

    const onMessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      const noticeStrings = noticeToText(msg);
      if (noticeStrings == null) return;
      if (Array.isArray(noticeStrings)) noticeStrings.forEach(addText);
      else addText(noticeStrings);
    };

    const onClose = () => setConnected(false);
    const onError = () => {}; // optional

    socket.addEventListener("open", onOpen);
    socket.addEventListener("message", onMessage as any);
    socket.addEventListener("close", onClose);
    socket.addEventListener("error", onError);

    // If already open (e.g., remount during Fast Refresh)
    if (socket.readyState === WebSocket.OPEN) onOpen();

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("message", onMessage as any);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("error", onError);
      releaseRef.current?.();
    };
  }, []);

  return (
    <div
      data-testid="scrolling-wss-container"
      className="relative w-full h-full overflow-hidden left-4 text-lightGreen"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 5%, white 30%, white 100%)",
        transform: "perspective(400px) rotateY(10deg)",
        transformStyle: "preserve-3d",
        color: "--var(lightGreen)",
      }}
    >
      {messageLines.map((line, idx) => (
        <motion.div
          key={idx}
          className="top-1/2 left-0 text-2xl whitespace-nowrap"
          initial={{ x: "-300%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
            delay: idx * 0.1,
          }}
        >
          <div>{line}</div>
        </motion.div>
      ))}
    </div>
  );
}

// --- HMR cleanup: close any orphaned sockets on module replace ---
if (import.meta && (import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    const g = (
      typeof window !== "undefined" ? window : (globalThis as any)
    ) as Window;
    const reg = g.__WS_REGISTRY__;
    if (!reg) return;
    Object.keys(reg).forEach((url) => {
      const e = reg[url];
      // Only close sockets with no consumers (should be most during replace)
      if (e.refs <= 0) {
        try {
          e.ws.close(1000, "HMR dispose");
        } catch {}
        delete reg[url];
      }
    });
  });
} else if (typeof module !== "undefined" && (module as any).hot) {
  // webpack-style (Next.js older setups)
  (module as any).hot.dispose(() => {
    const g = (
      typeof window !== "undefined" ? window : (globalThis as any)
    ) as Window;
    const reg = g.__WS_REGISTRY__;
    if (!reg) return;
    Object.keys(reg).forEach((url) => {
      const e = reg[url];
      if (e.refs <= 0) {
        try {
          e.ws.close(1000, "HMR dispose");
        } catch {}
        delete reg[url];
      }
    });
  });
}
