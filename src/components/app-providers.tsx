import React, { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureQueryManagers, queryClient, queryPersister } from '@/lib/query-client';
import { setSessionExpiredHandler } from '@/lib/http';
import { useAuthStore } from '@/state/auth-store';
import { FeedbackModal } from './ui';
import { IncomingCallModal } from './incoming-call-modal';
import { useNotificationsSocket } from '@/hooks/use-notifications-socket';
import { useCallsSocket } from '@/hooks/use-calls-socket';

function RuntimeBridge({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
    setSessionExpiredHandler(() => { void useAuthStore.getState().expireSession(); });
    const cleanupManagers = configureQueryManagers();
    return () => { setSessionExpiredHandler(null); cleanupManagers(); };
  }, [hydrate]);
  useNotificationsSocket();
  useCallsSocket();
  return <>{children}<FeedbackModal /><IncomingCallModal /></>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider><PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 12, dehydrateOptions: { shouldDehydrateQuery: (query) => !['messages', 'notifications', 'conversations', 'calls'].includes(String(query.queryKey[0])) } }}><RuntimeBridge>{children}</RuntimeBridge></PersistQueryClientProvider></SafeAreaProvider>;
}
