import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@/types';

const SESSION_KEY = 'flow.session.v1';
let memorySession: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  if (memorySession) return memorySession;
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    memorySession = JSON.parse(raw) as Session;
    return memorySession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export function getSessionSync() { return memorySession; }

export async function saveSession(payload: Record<string, unknown>): Promise<Session> {
  const { access, refresh, ...user } = payload as unknown as Session & User;
  if (!access || !refresh) throw new Error('The server returned an invalid session.');
  memorySession = { access, refresh, user: user as User };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(memorySession));
  return memorySession;
}

export async function setAccessToken(access: string) {
  if (!memorySession) return;
  memorySession = { ...memorySession, access };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(memorySession));
}

export async function updateStoredUser(user: Partial<User>) {
  if (!memorySession) return;
  memorySession = { ...memorySession, user: { ...memorySession.user, ...user } };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(memorySession));
}

export async function clearSession() {
  memorySession = null;
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
