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

  // Store callbacks in refs to avoid reconnecting when they change
  const onMessageRef = useRef(options.onMessage);
  const onOpenRef = useRef(options.onOpen);
  const onCloseRef = useRef(options.onClose);
  const onErrorRef = useRef(options.onError);

  onMessageRef.current = options.onMessage;
  onOpenRef.current = options.onOpen;
  onCloseRef.current = options.onClose;
  onErrorRef.current = options.onError;

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!runId) return;

    // Close any existing connection first
    disconnect();

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = (import.meta.env.VITE_API_HOST as string | undefined) || 'localhost:8000';
      const wsUrl = `${protocol}//${host}/ws/${runId}`;

      console.log('[WS] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Connected');
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          console.log('[WS] Received:', data.type, data);
          onMessageRef.current(data);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        onErrorRef.current?.(error);
      };

      ws.onclose = () => {
        console.log('[WS] Closed');
        onCloseRef.current?.();
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          // Only reconnect if we still have this runId
          if (wsRef.current === ws) {
            wsRef.current = null;
          }
        }, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
      onErrorRef.current?.(new Event('connection_error'));
    }

    return () => {
      disconnect();
    };
  }, [runId, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
  };
}
