"use client";

import { useState, useEffect, useRef } from "react";
import type { WSMessage } from "@/lib/types";

const SSE_URL = "https://api.yilingprotocol.com/events/stream";

/**
 * Real-time updates via Protocol API SSE stream.
 * Replaces old WebSocket connection to backend.
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setIsConnecting(true);

    try {
      const es = new EventSource(SSE_URL);
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
