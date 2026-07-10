import { create } from 'zustand';
import type { Session, User } from '@/types';
import { clearSession, loadSession, updateStoredUser } from '@/lib/session';
import * as api from '@/lib/api';

type AuthState = {
  session: Session | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,
  hydrate: async () => set({ session: await loadSession(), hydrated: true }),
  signIn: async (email, password) => set({ session: await api.login(email, password) }),
  signOut: async () => { try { await api.logout(); } finally { await clearSession(); set({ session: null }); } },
  updateUser: async (user) => {
    await updateStoredUser(user);
    const current = get().session;
    if (current) set({ session: { ...current, user: { ...current.user, ...user } } });
  },
}));
