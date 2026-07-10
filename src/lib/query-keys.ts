export const notificationKeys = {
  root: ['notifications'] as const,
  list: (userId?: number | null) => ['notifications', 'user', userId ?? 'anonymous', 'list'] as const,
  unread: (userId?: number | null) => ['notifications', 'user', userId ?? 'anonymous', 'unread'] as const,
};

export const communityKeys = {
  root: ['communities'] as const,
  list: (filters: Record<string, unknown> = {}) => ['communities', 'list', filters] as const,
  detail: (slug: string) => ['communities', 'detail', slug] as const,
  posts: (slug: string) => ['communities', 'posts', slug] as const,
  resources: (slug: string) => ['communities', 'resources', slug] as const,
  members: (slug: string) => ['communities', 'members', slug] as const,
};

export const marketplaceKeys = {
  root: ['marketplace'] as const,
  list: (filters: Record<string, unknown> = {}) => ['marketplace', 'list', filters] as const,
  mine: ['marketplace', 'mine'] as const,
  saved: ['marketplace', 'saved'] as const,
  detail: (id: number | string) => ['marketplace', 'detail', String(id)] as const,
};
