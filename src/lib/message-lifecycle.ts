import type { Message, MessageReceiptPayload } from '@/types';

export type ConversationSocketEvent =
  | { type: 'message.created' | 'message.updated' | 'message.deleted'; message: Message }
  | ({ type: 'message.receipt' } & MessageReceiptPayload)
  | { type: 'typing'; user_id: number; user_name?: string | null }
  | { type: 'error'; error: string };

export function parseConversationSocketFrame(value: unknown): ConversationSocketEvent | null {
  if (!value || typeof value !== 'object') return null;
  const frame = value as Record<string, unknown>;
  if (frame.type === 'typing' && typeof frame.user_id === 'number') {
    return { type: 'typing', user_id: frame.user_id, user_name: typeof frame.user_name === 'string' ? frame.user_name : null };
  }
  if (frame.type === 'error' && typeof frame.error === 'string') {
    return { type: 'error', error: frame.error };
  }
  if ((frame.type === 'message.created' || frame.type === 'message.updated' || frame.type === 'message.deleted') && frame.message && typeof frame.message === 'object') {
    return { type: frame.type, message: frame.message as Message };
  }
  if (
    frame.type === 'message.receipt' &&
    typeof frame.message_id === 'number' &&
    (frame.status === 'sent' || frame.status === 'delivered' || frame.status === 'read')
  ) {
    return {
      type: 'message.receipt',
      message_id: frame.message_id,
      status: frame.status,
      recipient_count: Number(frame.recipient_count || 0),
      delivered_count: Number(frame.delivered_count || 0),
      read_count: Number(frame.read_count || 0),
      is_read: Boolean(frame.is_read),
    };
  }
  return null;
}

export function upsertMessage(messages: Message[], message: Message): Message[] {
  const next = [...messages.filter((item) => item.id !== message.id), message];
  return next.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

export function applyMessageReceipt(messages: Message[], receipt: MessageReceiptPayload): Message[] {
  return messages.map((message) => message.id === receipt.message_id ? { ...message, ...receipt } : message);
}

export function messageStatusLabel(message: Message): string {
  const status = message.status || (message.is_read ? 'read' : 'sent');
  const total = message.recipient_count || 0;
  if (status === 'read') return total > 1 ? `Read ${message.read_count || 0}/${total}` : 'Read';
  if (status === 'delivered') return total > 1 ? `Delivered ${message.delivered_count || 0}/${total}` : 'Delivered';
  return 'Sent';
}

export function deletedMessage(message: Message): Message {
  return {
    ...message,
    content: '',
    is_deleted: true,
    deleted_at: message.deleted_at || new Date().toISOString(),
  };
}