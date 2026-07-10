import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FeedbackModal } from '@/components/ui';
import { showConfirm, showSuccess, useUIStore } from '@/state/ui-store';

describe('unified feedback modal', () => {
  afterEach(() => useUIStore.getState().hide());

  it('renders and closes success feedback', async () => {
    showSuccess('Saved', 'Your profile is updated.');
    const screen = await render(<FeedbackModal />);
    expect(screen.getByText('Saved')).toBeTruthy();
    fireEvent.press(screen.getByText('Okay'));
    expect(useUIStore.getState().visible).toBe(false);
  });

  it('runs confirmation actions only after confirmation', async () => {
    const action = jest.fn();
    showConfirm('Delete post?', 'This cannot be undone.', action);
    const screen = await render(<FeedbackModal />);
    fireEvent.press(screen.getByText('Continue'));
    expect(action).toHaveBeenCalledTimes(1);
  });
});
