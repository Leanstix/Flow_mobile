import {
  applyMessageReceipt,
  deletedMessage,
  messageStatusLabel,
  parseConversationSocketFrame,
  upsertMessage,
} from '@/lib/message-lifecycle';
import type { Message } from '@/types';

const baseMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 1,
  conversation: 2,
  sender: { id: 7, email: 'student@example.com', user_name: 'student' },
  content: 'Hello',
  timestamp: '2026-07-10T12:00:00Z',
  is_read: false,
  status: 'sent',
  recipient_count: 1,
  delivered_count: 0,
  read_count: 0,
  ...overrides,
});

describe('message lifecycle helpers', () => {
  it('parses supported websocket frames and rejects malformed payloads', () => {
    const message = baseMessage();
    expect(parseConversationSocketFrame({ type: 'message.updated', message })).toEqual({ type: 'message.updated', message });
    expect(parseConversationSocketFrame({ type: 'message.receipt', message_id: 1, status: 'read', recipient_count: 1, delivered_count: 1, read_count: 1, is_read: true })).toEqual({
      type: 'message.receipt', message_id: 1, status: 'read', recipient_count: 1, delivered_count: 1, read_count: 1, is_read: true,
    });
    expect(parseConversationSocketFrame({ type: 'typing', user_id: 3, user_name: 'Ada' })).toEqual({ type: 'typing', user_id: 3, user_name: 'Ada' });
    expect(parseConversationSocketFrame({ type: 'message.receipt', status: 'unknown' })).toBeNull();
    expect(parseConversationSocketFrame(null)).toBeNull();
  });

  it('upserts edits without duplicating and keeps chronological order', () => {
    const later = baseMessage({ id: 2, timestamp: '2026-07-10T12:02:00Z', content: 'Later' });
    const edited = baseMessage({ content: 'Edited', edited_at: '2026-07-10T12:03:00Z' });
    expect(upsertMessage([later, baseMessage()], edited)).toEqual([edited, later]);
  });

  it('applies receipt updates only to the matching message', () => {
    const other = baseMessage({ id: 2, content: 'Other' });
    const result = applyMessageReceipt([baseMessage(), other], {
      message_id: 1,
      status: 'delivered',
      recipient_count: 2,
      delivered_count: 2,
      read_count: 0,
      is_read: false,
    });
    expect(result[0]).toMatchObject({ status: 'delivered', recipient_count: 2, delivered_count: 2 });
    expect(result[1]).toEqual(other);
  });

  it('formats direct and group receipt statuses', () => {
    expect(messageStatusLabel(baseMessage())).toBe('Sent');
    expect(messageStatusLabel(baseMessage({ status: 'delivered', delivered_count: 1 }))).toBe('Delivered');
    expect(messageStatusLabel(baseMessage({ status: 'read', is_read: true, read_count: 1 }))).toBe('Read');
    expect(messageStatusLabel(baseMessage({ status: 'read', is_read: true, recipient_count: 3, read_count: 2 }))).toBe('Read 2/3');
  });

  it('creates a local soft-delete placeholder', () => {
    const result = deletedMessage(baseMessage());
    expect(result.content).toBe('');
    expect(result.is_deleted).toBe(true);
    expect(result.deleted_at).toBeTruthy();
  });
});