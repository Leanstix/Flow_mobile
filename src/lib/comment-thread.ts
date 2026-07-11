import type { Comment } from '@/types';

export type CommentNode = Comment & { children: CommentNode[] };

export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map<number, CommentNode>(comments.map((comment) => [comment.id, { ...comment, children: [] }]));
  const roots: CommentNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parent ? nodes.get(node.parent) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (items: CommentNode[]) => items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((item) => ({ ...item, children: sort(item.children) }));
  return sort(roots);
}

export function cappedIndent(depth = 0) {
  return Math.min(Math.max(depth, 0), 5) * 16;
}
