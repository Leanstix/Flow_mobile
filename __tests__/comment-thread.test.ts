import { buildCommentTree, cappedIndent } from '@/lib/comment-thread';
import type { Comment } from '@/types';

const user = { id: 1, email: 'student@example.com', user_name: 'student' };

function comment(id: number, parent: number | null, depth: number): Comment {
  return { id, post: 1, parent, root: 1, depth, user, content: `Comment ${id}`, created_at: `2026-01-0${id}T00:00:00Z`, replies_count: 0 };
}

describe('mobile comment threads', () => {
  it('assembles replies at arbitrary depth', () => {
    const tree = buildCommentTree([
      comment(4, 3, 3),
      comment(1, null, 0),
      comment(3, 2, 2),
      comment(2, 1, 1),
    ]);
    expect(tree[0].children[0].children[0].children[0].id).toBe(4);
  });

  it('caps indentation without capping the actual thread depth', () => {
    expect(cappedIndent(2)).toBe(32);
    expect(cappedIndent(99)).toBe(80);
  });
});
