import { useCallback, useEffect, useRef, useState } from 'react';
import { parseConversationSocketFrame, type ConversationSocketEvent } from '@/lib/message-lifecycle';
import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';

export function useConversationSocket(conversationId: number, onEvent: (event: ConversationSocketEvent) => void) {
  const access = useAuthStore((state) => state.session?.access);
  const socket = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    if (!access || !conversationId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      socket.current = new WebSocket(buildWebSocketUrl(`/ws/conversations/${conversationId}/`, access));
      socket.current.onopen = () => {
        retries.current = 0;
        setConnected(true);
      };
      socket.current.onmessage = (messageEvent) => {
        try {
          const parsed = parseConversationSocketFrame(JSON.parse(messageEvent.data));
          if (parsed) onEvent(parsed);
        } catch {
          // Ignore malformed frames while preserving the conversation socket.
        }
      };
      socket.current.onclose = (closeEvent) => {
        setConnected(false);
        if (closeEvent.code === 4401) useAuthStore.setState({ session: null });
        if (!active || closeEvent.code === 4401 || closeEvent.code === 4403) return;
        timer = setTimeout(connect, reconnectDelay(retries.current++));
      };
    };

    connect();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      socket.current?.close();
    };
  }, [access, conversationId, onEvent]);

  const send = useCallback((content: string, replyTo?: number | null) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify({ content, ...(replyTo ? { reply_to: replyTo } : {}) }));
    return true;
  }, []);

  const sendRead = useCallback(() => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify({ type: 'read' }));
    return true;
  }, []);

  const lastTypingAt = useRef(0);
  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingAt.current < 1200) return;
    lastTypingAt.current = now;
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'typing' }));
  }, []);

  return { connected, send, sendRead, sendTyping };
}