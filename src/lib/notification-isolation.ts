import type { Notification, Paginated } from '@/types';

export function isNotificationForUser(notification: Notification | null | undefined, userId?: number | null) {
  return Boolean(notification && userId && Number(notification.recipient) === Number(userId));
}

export function filterNotificationsForUser(
  payload: Notification[] | Paginated<Notification> | undefined,
  userId?: number | null,
): Notification[] | Paginated<Notification> | undefined {
  if (!payload || !userId) return payload;
  if (Array.isArray(payload)) return payload.filter((item) => isNotificationForUser(item, userId));
  const results = payload.results.filter((item) => isNotificationForUser(item, userId));
  return { ...payload, count: results.length, results };
}

export function mergeNotificationForUser(
  current: Notification[] | Paginated<Notification> | undefined,
  notification: Notification,
  userId?: number | null,
): Notification[] | Paginated<Notification> | undefined {
  if (!isNotificationForUser(notification, userId)) return current;
  if (!current) return [notification];
  if (Array.isArray(current)) return [notification, ...current.filter((item) => item.id !== notification.id)];
  const existing = current.results || [];
  const isNew = !existing.some((item) => item.id === notification.id);
  return {
    ...current,
    count: Math.max(current.count || existing.length, existing.length) + (isNew ? 1 : 0),
    results: [notification, ...existing.filter((item) => item.id !== notification.id)],
  };
}
