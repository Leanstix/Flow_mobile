import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error: any) => error?.status === 404 || error?.status === 403 ? false : failureCount < 2,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

export const queryPersister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'flow.query-cache.v1', throttleTime: 1000 });

let managersConfigured = false;
export function configureQueryManagers() {
  if (managersConfigured) return () => undefined;
  managersConfigured = true;
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))));
  const appStateSubscription = Platform.OS !== 'web' ? AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active')) : null;
  return () => { appStateSubscription?.remove(); };
}
