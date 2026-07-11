import { useEffect, useRef } from 'react';
import { fetchIncomingCalls } from '@/lib/api';
import { isIncomingCallForUser, parseUserCallEvent } from '@/lib/call-lifecycle';
import { buildWebSocketUrl, reconnectDelay } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';
import { useCallStore } from '@/state/call-store';

export function useCallsSocket() {
  const access = useAuthStore((state) => state.session?.access);
  const userId = useAuthStore((state) => state.session?.user.id || state.session?.user.user_id);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const updateIncomingCall = useCallStore((state) => state.updateIncomingCall);
  const clearIncomingCall = useCallStore((state) => state.clearIncomingCall);
  const retries = useRef(0);

  useEffect(() => {
    if (!access || !userId) {
      clearIncomingCall();
      return;
    }

    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    void fetchIncomingCalls()
      .then((calls) => {
        if (!active) return;
        const ringing = calls.find((call) => isIncomingCallForUser(call, userId));
        if (ringing) setIncomingCall(ringing);
      })
      .catch(() => undefined);

    const connect = () => {
      socket = new WebSocket(buildWebSocketUrl('/ws/calls/', access));
      socket.onopen = () => { retries.current = 0; };
      socket.onmessage = (event) => {
        try {
          const payload = parseUserCallEvent(JSON.parse(event.data));
          const call = payload?.call;
          if (!payload || !call) return;

          if (payload.type === 'call.incoming' && isIncomingCallForUser(call, userId)) {
            setIncomingCall(call);
            return;
          }
          if (payload.type === 'call.updated' || payload.type === 'call.accepted') {
            updateIncomingCall(call);
          }
          if (['call.rejected', 'call.ended'].includes(payload.type) || call.status === 'ended' || call.status === 'rejected') {
            clearIncomingCall(call.room_name);
          }
        } catch {
          // Ignore malformed frames without killing the private call channel.
        }
      };
      socket.onclose = (event) => {
        if (event.code === 4401) void useAuthStore.getState().expireSession();
        if (!active || event.code === 4401 || event.code === 4403) return;
        timer = setTimeout(connect, reconnectDelay(retries.current++));
      };
    };

    connect();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
  }, [access, clearIncomingCall, setIncomingCall, updateIncomingCall, userId]);
}
