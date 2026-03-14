import { useEffect, useRef, useCallback } from 'react';
import type { WSEvent } from '../types';

interface UseWebSocketOptions {
  onMessage: (event: WSEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(runId: string | null, options: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = (import.meta.env.VITE_API_HOST as string | undefined) || 'localhost:8000';
      const wsUrl = `${protocol}//${host}/ws/${runId}`;

      console.log('[WS] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected');
        options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          console.log('[WS] Received:', data.type, data);
          options.onMessage(data);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        options.onError?.(error);
      };

      ws.onclose = () => {
        console.log('[WS] Closed');
        options.onClose?.();
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
      options.onError?.(new Event('connection_error'));
    }
  }, [runId, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (runId) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [runId, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
  };
}
