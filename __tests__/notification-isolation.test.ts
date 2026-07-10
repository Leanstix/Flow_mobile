import { filterNotificationsForUser, isNotificationForUser, mergeNotificationForUser } from '@/lib/notification-isolation';
import { notificationKeys } from '@/lib/query-keys';
import type { Notification } from '@/types';

const aliceNotification: Notification = {
  id: 1,
  recipient: 10,
  actor: { id: 20, email: 'actor@example.com' },
  verb: 'like',
  message: 'liked your post',
  is_read: false,
  created_at: '2026-07-10T10:00:00Z',
};
const bobNotification: Notification = { ...aliceNotification, id: 2, recipient: 11 };

describe('notification account isolation', () => {
  it('uses separate cache keys for separate accounts', () => {
    expect(notificationKeys.list(10)).not.toEqual(notificationKeys.list(11));
    expect(notificationKeys.unread(10)).not.toEqual(notificationKeys.unread(11));
  });

  it('rejects websocket notifications addressed to another user', () => {
    expect(isNotificationForUser(aliceNotification, 10)).toBe(true);
    expect(isNotificationForUser(aliceNotification, 11)).toBe(false);
    expect(mergeNotificationForUser([bobNotification], aliceNotification, 11)).toEqual([bobNotification]);
  });

  it('filters restored and fetched notification payloads by recipient', () => {
    expect(filterNotificationsForUser([aliceNotification, bobNotification], 10)).toEqual([aliceNotification]);
    expect(filterNotificationsForUser({ count: 2, results: [aliceNotification, bobNotification] }, 11)).toEqual({ count: 1, results: [bobNotification] });
  });

  it('deduplicates repeated socket frames for the same user', () => {
    const merged = mergeNotificationForUser({ count: 1, results: [aliceNotification] }, aliceNotification, 10);
    expect(merged).toEqual({ count: 1, results: [aliceNotification] });
  });
});
