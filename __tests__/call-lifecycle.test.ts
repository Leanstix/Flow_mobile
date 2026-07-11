import {
  availableCallInvitees,
  callUserId,
  invitationStatusForUser,
  isIncomingCallForUser,
  parseUserCallEvent,
  shouldInitiateOffer,
} from '@/lib/call-lifecycle';
import type { CallSession, User } from '@/types';

const alice: User = { id: 1, email: 'alice@example.com', user_name: 'alice' };
const bob: User = { id: 2, email: 'bob@example.com', user_name: 'bob' };
const charlie: User = { id: 3, email: 'charlie@example.com', user_name: 'charlie' };

const call: CallSession = {
  id: 1,
  room_name: 'room-1',
  created_by: alice,
  conversation_id: 9,
  call_type: 'video',
  status: 'ringing',
  participants: [alice, bob],
  invitations: [
    { id: 1, user: alice, invited_by: alice, status: 'accepted', created_at: '2026-07-11T00:00:00Z' },
    { id: 2, user: bob, invited_by: alice, status: 'ringing', created_at: '2026-07-11T00:00:00Z' },
  ],
  created_at: '2026-07-11T00:00:00Z',
};

describe('call lifecycle helpers', () => {
  it('identifies only the invited ringing recipient as an incoming call owner', () => {
    expect(invitationStatusForUser(call, 1)).toBe('accepted');
    expect(invitationStatusForUser(call, 2)).toBe('ringing');
    expect(isIncomingCallForUser(call, 1)).toBe(false);
    expect(isIncomingCallForUser(call, 2)).toBe(true);
    expect(isIncomingCallForUser(call, 3)).toBe(false);
  });

  it('uses deterministic peer ordering to avoid offer glare', () => {
    expect(shouldInitiateOffer(1, 2)).toBe(true);
    expect(shouldInitiateOffer(2, 1)).toBe(false);
    expect(shouldInitiateOffer(2, 2)).toBe(false);
  });

  it('excludes existing call participants from invite choices', () => {
    expect(availableCallInvitees([alice, bob, charlie], call)).toEqual([charlie]);
  });

  it('parses valid private call events and rejects malformed call payloads', () => {
    expect(parseUserCallEvent({ type: 'call.incoming', call })).toEqual({ type: 'call.incoming', call });
    expect(parseUserCallEvent({ type: 'call.incoming', call: { room_name: '' } })).toBeNull();
    expect(parseUserCallEvent(null)).toBeNull();
  });

  it('normalizes either user id shape', () => {
    expect(callUserId({ user_id: 7, email: 'legacy@example.com' })).toBe(7);
  });
});
