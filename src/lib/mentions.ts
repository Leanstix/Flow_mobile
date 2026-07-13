import type { User } from '@/types';

const ACTIVE_MENTION_PATTERN = /(^|\s)@([A-Za-z0-9_.]*)$/;
const MENTION_TOKEN_PATTERN = /(?<![\w@])@([A-Za-z0-9_.]+)/g;

export type ActiveMention = { start: number; end: number; query: string };

export function getActiveMention(value: string, cursor = value.length): ActiveMention | null {
  const beforeCursor = String(value || '').slice(0, cursor);
  const match = beforeCursor.match(ACTIVE_MENTION_PATTERN);
  if (!match) return null;
  const query = match[2] || '';
  return { start: cursor - query.length - 1, end: cursor, query };
}

export function insertMention(value: string, active: ActiveMention, username: string) {
  const replacement = `@${username} `;
  const nextValue = `${value.slice(0, active.start)}${replacement}${value.slice(active.end)}`;
  return { value: nextValue, cursor: active.start + replacement.length };
}

export function mentionTokens(value: string) {
  const tokens = new Set<string>();
  for (const match of String(value || '').matchAll(MENTION_TOKEN_PATTERN)) {
    tokens.add(match[1].toLowerCase());
  }
  return tokens;
}

export function validMentionIds(value: string, selectedUsers: User[]) {
  const tokens = mentionTokens(value);
  return selectedUsers
    .filter((user) => user.id && user.user_name && tokens.has(user.user_name.toLowerCase()))
    .map((user) => Number(user.id));
}

export function mergeMentionUser(users: User[], selected: User) {
  if (!selected.id) return users;
  return [...users.filter((user) => Number(user.id) !== Number(selected.id)), selected];
}
