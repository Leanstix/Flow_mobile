jest.mock('@/lib/api', () => ({
  login: jest.fn(async () => ({ access: 'a', refresh: 'r', user: { email: 'student@example.com' } })),
  logout: jest.fn(async () => undefined),
}));

jest.mock('@/lib/session', () => ({
  clearSession: jest.fn(async () => undefined),
  loadSession: jest.fn(async () => null),
  updateStoredUser: jest.fn(async () => undefined),
}));

import { useAuthStore } from '@/state/auth-store';

describe('auth state', () => {
  beforeEach(() => useAuthStore.setState({ session: null, hydrated: false }));

  it('hydrates and signs in', async () => {
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().hydrated).toBe(true);
    await useAuthStore.getState().signIn('student@example.com', 'password');
    expect(useAuthStore.getState().session?.user.email).toBe('student@example.com');
  });

  it('clears local state during sign out', async () => {
    useAuthStore.setState({ session: { access: 'a', refresh: 'r', user: { email: 'student@example.com' } } });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
