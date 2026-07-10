import { showApiError, showError, showSuccess, useUIStore } from '@/state/ui-store';
import { usePreferencesStore } from '@/state/preferences-store';

describe('persisted preferences and unified feedback state', () => {
  beforeEach(() => {
    useUIStore.getState().hide();
    usePreferencesStore.setState({ realtimeNotifications: true, messagePreviews: true, reduceMotion: false });
  });

  it('updates app preferences', () => {
    usePreferencesStore.getState().update('messagePreviews', false);
    expect(usePreferencesStore.getState().messagePreviews).toBe(false);
  });

  it('creates success and error feedback', () => {
    showSuccess('Saved', 'Done');
    expect(useUIStore.getState()).toMatchObject({ visible: true, type: 'success', title: 'Saved' });
    showError('Failed', 'Try again');
    expect(useUIStore.getState()).toMatchObject({ visible: true, type: 'error', title: 'Failed' });
    showApiError({ response: { status: 400, data: { detail: 'Bad request' } } }, 'API failed');
    expect(useUIStore.getState().message).toBe('Bad request');
  });
});
