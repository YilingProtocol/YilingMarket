"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useChain } from "@/lib/chainContext";
import type { WSMessage } from "@/lib/types";

export function useWebSocket() {
  const { chainConfig } = useChain();
  const wsUrl = chainConfig.wsUrl;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!wsUrl) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        retryDelay.current = 1000;
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will handle reconnect
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          setLastMessage(msg);
        } catch (err) {
          console.error("WS parse error:", err);
        }
      };
    } catch {
      setIsConnecting(false);
      scheduleReconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl]);

  const scheduleReconnect = useCallback(() => {
    if (retryTimer.current) return;
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      connect();
    }, retryDelay.current);
    retryDelay.current = Math.min(retryDelay.current * 1.5, 30000);
  }, [connect]);

  // Reconnect when chain changes
  useEffect(() => {
    // Close existing connection
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    retryDelay.current = 1000;
    setIsConnected(false);
    setLastMessage(null);

    connect();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected, isConnecting, lastMessage };
}
