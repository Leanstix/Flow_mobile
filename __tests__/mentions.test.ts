import {
  getActiveMention,
  insertMention,
  mergeMentionUser,
  validMentionIds,
} from '@/lib/mentions';

describe('mention helpers', () => {
  it('detects an active mention without treating emails as mentions', () => {
    expect(getActiveMention('Hello @lea', 10)).toEqual({ start: 6, end: 10, query: 'lea' });
    expect(getActiveMention('student@example.com', 19)).toBeNull();
  });

  it('inserts the selected username without duplicate whitespace', () => {
    const active = getActiveMention('Hello @lea world', 10);
    expect(active).not.toBeNull();
    expect(insertMention('Hello @lea world', active!, 'leanstix')).toEqual({
      value: 'Hello @leanstix world',
      cursor: 15,
    });
  });

  it('submits only selected users whose token remains in the post', () => {
    const users = mergeMentionUser([], { id: 7, email: 'leanstix@example.com', user_name: 'leanstix' });
    expect(validMentionIds('Hello @leanstix', users)).toEqual([7]);
    expect(validMentionIds('Hello @someone_else', users)).toEqual([]);
  });
});
