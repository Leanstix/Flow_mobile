import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/query-client';
import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';
import { usePreferencesStore } from '@/state/preferences-store';
import type { Notification } from '@/types';

export function useNotificationsSocket() {
  const access = useAuthStore((s) => s.session?.access);
  const enabled = usePreferencesStore((s) => s.realtimeNotifications);
  const retries = useRef(0);
  useEffect(() => {
    if (!access || !enabled) return;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;
    const connect = () => {
      socket = new WebSocket(buildWebSocketUrl('/ws/notifications/', access));
      socket.onopen = () => { retries.current = 0; };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const notification = payload.notification as Notification | undefined;
          if (!notification) return;
          queryClient.setQueryData(['notifications'], (current: any) => Array.isArray(current) ? [notification, ...current] : current?.results ? { ...current, results: [notification, ...current.results], count: current.count + 1 } : [notification]);
          queryClient.setQueryData(['notifications', 'unread'], (current: any) => ({ unread_count: (current?.unread_count || 0) + 1 }));
        } catch {
          // Ignore malformed websocket frames without terminating the live connection.
        }
      };
      socket.onclose = (event) => {
        if (event.code === 4401) useAuthStore.setState({ session: null });
        if (!active || event.code === 4401 || event.code === 4403) return;
        timer = setTimeout(connect, reconnectDelay(retries.current++));
      };
    };
    connect();
    return () => { active = false; if (timer) clearTimeout(timer); socket?.close(); };
  }, [access, enabled]);
}
