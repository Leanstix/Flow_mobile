import * as SecureStore from 'expo-secure-store';
import { clearSession, getSessionSync, loadSession, saveSession, setAccessToken, updateStoredUser } from '@/lib/session';

const mockedStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('secure session storage', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedStore.getItemAsync.mockResolvedValue(null);
    await clearSession();
  });

  it('persists and hydrates a valid session', async () => {
    const session = await saveSession({ access: 'access-1', refresh: 'refresh-1', user_id: 7, email: 'student@example.com', user_name: 'student' });
    expect(session.user.email).toBe('student@example.com');
    expect(mockedStore.setItemAsync).toHaveBeenCalled();
    expect(getSessionSync()?.access).toBe('access-1');
  });

  it('updates tokens and user data without discarding the session', async () => {
    await saveSession({ access: 'old', refresh: 'refresh', user_id: 2, email: 'a@b.com' });
    await setAccessToken('new');
    await updateStoredUser({ first_name: 'Ada' });
    expect(getSessionSync()?.access).toBe('new');
    expect(getSessionSync()?.user.first_name).toBe('Ada');
  });

  it('clears malformed persisted data', async () => {
    await clearSession();
    mockedStore.getItemAsync.mockResolvedValue('{bad json');
    await expect(loadSession()).resolves.toBeNull();
    expect(mockedStore.deleteItemAsync).toHaveBeenCalled();
  });
});
