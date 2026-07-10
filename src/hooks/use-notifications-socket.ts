import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/query-client';
import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';
import { notificationKeys } from '@/lib/query-keys';
import { isNotificationForUser, mergeNotificationForUser } from '@/lib/notification-isolation';
import { useAuthStore } from '@/state/auth-store';
import { usePreferencesStore } from '@/state/preferences-store';
import type { Notification } from '@/types';

export function useNotificationsSocket() {
  const access = useAuthStore((s) => s.session?.access);
  const userId = useAuthStore((s) => s.session?.user.id || s.session?.user.user_id);
  const enabled = usePreferencesStore((s) => s.realtimeNotifications);
  const retries = useRef(0);

  useEffect(() => {
    if (!access || !enabled || !userId) return;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const connect = () => {
      socket = new WebSocket(buildWebSocketUrl(`/ws/notifications/?client_user=${encodeURIComponent(userId)}`, access));
      socket.onopen = () => { retries.current = 0; };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const notification = payload.notification as Notification | undefined;
          if (!isNotificationForUser(notification, userId)) return;
          queryClient.setQueryData(notificationKeys.list(userId), (current: any) => mergeNotificationForUser(current, notification!, userId));
          queryClient.setQueryData(notificationKeys.unread(userId), (current: any) => ({ unread_count: (current?.unread_count || 0) + 1 }));
        } catch {
          // Malformed websocket frames are ignored without terminating the connection.
        }
      };
      socket.onclose = (event) => {
        if (event.code === 4401) void useAuthStore.getState().expireSession();
        if (!active || event.code === 4401 || event.code === 4403) return;
        timer = setTimeout(connect, reconnectDelay(retries.current++));
      };
    };

    connect();
    return () => { active = false; if (timer) clearTimeout(timer); socket?.close(); };
  }, [access, enabled, userId]);
}
