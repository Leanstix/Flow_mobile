import type { CallSession, CallSocketEvent, User } from '@/types';

export function callUserId(user?: User | null) {
  return Number(user?.id || user?.user_id || 0);
}

export function invitationStatusForUser(call: CallSession, userId: number) {
  return call.invitations.find((invitation) => callUserId(invitation.user) === Number(userId))?.status;
}

export function isIncomingCallForUser(call: CallSession | null | undefined, userId: number) {
  if (!call || !userId || !['ringing', 'active'].includes(call.status)) return false;
  return invitationStatusForUser(call, userId) === 'ringing';
}

export function shouldInitiateOffer(currentUserId: number, remoteUserId: number) {
  return Boolean(currentUserId && remoteUserId && currentUserId !== remoteUserId && currentUserId < remoteUserId);
}

export function availableCallInvitees(users: User[], call?: CallSession | null) {
  const existing = new Set((call?.participants || []).map(callUserId));
  return users.filter((user) => !existing.has(callUserId(user)));
}

export function parseUserCallEvent(value: unknown): CallSocketEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as CallSocketEvent;
  if (typeof event.type !== 'string') return null;
  if (event.call && (!event.call.room_name || !event.call.call_type || !event.call.status)) return null;
  return event;
}
