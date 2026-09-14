import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  roomId: string;
  username: string;
  onCodeUpdate?: (code: string, username: string) => void;
  onCursorUpdate?: (username: string, position: any) => void;
  onChatMessage?: (username: string, message: string, timestamp: number) => void;
  onUserJoined?: (username: string) => void;
  onUserLeft?: (username: string) => void;
}

export function useWebSocket({
  roomId,
  username,
  onCodeUpdate,
  onCursorUpdate,
  onChatMessage,
  onUserJoined,
  onUserLeft,
}: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    if (connecting || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    setConnecting(true);

    // Get WebSocket URL from environment
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const url = `${wsUrl}?roomId=${roomId}&username=${encodeURIComponent(username)}`;

    console.log('Connecting to WebSocket:', url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setConnecting(false);

      // Request sync with room state
      ws.send(JSON.stringify({
        action: 'request_sync',
        roomId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        switch (data.type) {
          case 'code_update':
            onCodeUpdate?.(data.code, data.username);
            break;

          case 'cursor_update':
            onCursorUpdate?.(data.username, data.position);
            break;

          case 'chat_message':
            onChatMessage?.(data.username, data.message, data.timestamp);
            break;

          case 'user_joined':
            onUserJoined?.(data.username);
            setActiveUsers(prev => [...prev, data.username]);
            break;

          case 'user_left':
            onUserLeft?.(data.username);
            setActiveUsers(prev => prev.filter(u => u !== data.username));
            break;

          case 'sync_response':
            // Handle initial room state
            if (data.code && onCodeUpdate) {
              onCodeUpdate(data.code, 'system');
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnecting(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setConnecting(false);
      wsRef.current = null;

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [roomId, username, connecting, onCodeUpdate, onCursorUpdate, onChatMessage, onUserJoined, onUserLeft]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendCodeChange = useCallback((code: string, language: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'code_change',
        code,
        language,
      }));
    }
  }, []);

  const sendCursorMove = useCallback((position: { line: number; column: number }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'cursor_move',
        position,
      }));
    }
  }, []);

  const sendChatMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'chat_message',
        message,
      }));
    }
  }, []);

  return {
    connected,
    connecting,
    activeUsers,
    sendCodeChange,
    sendCursorMove,
    sendChatMessage,
  };
}
