"use client";

import { useState, useEffect, useRef } from "react";
import type { WSMessage } from "@/lib/types";

const STREAM_URL = "https://api.yilingprotocol.com/events/stream";

/**
 * Subscribe to real-time updates via the Protocol API Server-Sent Events stream.
 */
export function useEventStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setIsConnecting(true);

    try {
      const es = new EventSource(STREAM_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setLastMessage({
            type: data.type || "event",
            data,
          });
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        setIsConnecting(false);
        // EventSource auto-reconnects
      };
    } catch {
      setIsConnecting(false);
    }

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return { isConnected, isConnecting, lastMessage };
}
