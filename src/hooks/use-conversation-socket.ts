import { useCallback, useEffect, useRef, useState } from 'react';
import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';
import type { Message } from '@/types';

type TypingPayload = { user_id: number; user_name?: string | null };

export function useConversationSocket(conversationId: number, onMessage: (message: Message) => void, onTyping?: (payload: TypingPayload) => void) {
  const access = useAuthStore((s) => s.session?.access);
  const socket = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const retries = useRef(0);
  useEffect(() => {
    if (!access || !conversationId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      socket.current = new WebSocket(buildWebSocketUrl(`/ws/conversations/${conversationId}/`, access));
      socket.current.onopen = () => { retries.current = 0; setConnected(true); };
      socket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) onMessage(data.message);
          if (data.type === 'typing') onTyping?.({ user_id: data.user_id, user_name: data.user_name });
        } catch {
          // Ignore malformed frames while preserving the conversation socket.
        }
      };
      socket.current.onclose = (event) => {
        setConnected(false);
        if (event.code === 4401) useAuthStore.setState({ session: null });
        if (!active || event.code === 4401 || event.code === 4403) return;
        timer = setTimeout(connect, reconnectDelay(retries.current++));
      };
    };
    connect();
    return () => { active = false; if (timer) clearTimeout(timer); socket.current?.close(); };
  }, [access, conversationId, onMessage, onTyping]);
  const send = useCallback((content: string) => { if (socket.current?.readyState !== WebSocket.OPEN) return false; socket.current.send(JSON.stringify({ content })); return true; }, []);
  const lastTypingAt = useRef(0);
  const sendTyping = useCallback(() => { const now = Date.now(); if (now - lastTypingAt.current < 1200) return; lastTypingAt.current = now; if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'typing' })); }, []);
  return { connected, send, sendTyping };
}
