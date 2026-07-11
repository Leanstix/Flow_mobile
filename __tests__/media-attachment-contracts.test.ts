jest.mock('@/lib/http', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('@/lib/session', () => ({
  clearSession: jest.fn(),
  getSessionSync: jest.fn(() => ({ refresh: 'refresh-token' })),
  saveSession: jest.fn((data) => data),
  updateStoredUser: jest.fn(),
}));

import api from '@/lib/http';
import {
  contactMarketplaceSeller,
  createPostWithMedia,
  fetchCommentReplies,
  fetchHashtagPosts,
  searchHashtags,
  sendMessageAttachment,
} from '@/lib/api';

const mockedApi = api as jest.Mocked<typeof api>;

describe('media and attachment contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: [] } as any);
    mockedApi.post.mockResolvedValue({ data: { id: 1 } } as any);
  });

  it('uploads mobile posts with trim metadata', async () => {
    await createPostWithMedia(
      'Campus clip #flow',
      [{ uri: 'file:///clip.mp4', name: 'clip.mp4', type: 'video/mp4' }],
      [{ duration_seconds: 260, trim_start_seconds: 40, trim_end_seconds: 180 }],
    );
    const [path, form] = mockedApi.post.mock.calls[0] as [string, FormData];
    expect(path).toBe('/posts/');
    expect(form.get('platform')).toBe('mobile');
    expect(form.get('media_metadata')).toContain('trim_start_seconds');
  });

  it('uses hashtag and complete-thread routes', async () => {
    await searchHashtags('#campus');
    await fetchHashtagPosts('#campus', 2);
    await fetchCommentReplies(9);
    expect(mockedApi.get).toHaveBeenCalledWith('/posts/hashtags/', { params: { q: 'campus' } });
    expect(mockedApi.get).toHaveBeenCalledWith('/posts/hashtags/campus/', { params: { page: 2, limit: 10 } });
    expect(mockedApi.get).toHaveBeenCalledWith('/posts/comments/9/replies/', { params: { limit: 100 } });
  });

  it('sends an explicitly typed document attachment', async () => {
    await sendMessageAttachment({
      conversationId: 4,
      content: 'Lecture notes',
      replyTo: 7,
      kind: 'document',
      files: [{ uri: 'file:///notes.pdf', name: 'notes.pdf', type: 'application/pdf' }],
    });
    const [path, form] = mockedApi.post.mock.calls[0] as [string, FormData];
    expect(path).toBe('/conversations/4/send_message/');
    expect(form.get('attachment_type')).toBe('document');
    expect(form.get('reply_to')).toBe('7');
  });

  it('contacts a seller through the listing-aware endpoint', async () => {
    await contactMarketplaceSeller(12, 'Is it available?');
    expect(mockedApi.post).toHaveBeenCalledWith('/marketplace/listings/12/contact_seller/', { message: 'Is it available?' });
  });
});
