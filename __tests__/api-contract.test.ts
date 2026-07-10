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
  acceptFriendRequest,
  activateAccount,
  addComment,
  createConversation,
  createPost,
  createRoom,
  deletePost,
  fetchCommentReplies,
  fetchConversations,
  fetchMessages,
  fetchNotifications,
  fetchUnreadNotificationCount,
  getFeedPosts,
  getFriendRequests,
  getFriends,
  getFriendsFeed,
  getPosts,
  getUserProfile,
  joinRoom,
  login,
  logout,
  markAllNotificationsRead,
  markConversationRead,
  markNotificationRead,
  passwordChange,
  replyToComment,
  reportPost,
  repost,
  searchPosts,
  searchUsers,
  sendFriendRequest,
  sendMessage,
  signUp,
  toggleLike,
  unwrapList,
  updateUserProfile,
  uploadProfilePicture,
} from '@/lib/api';

const mockedApi = api as jest.Mocked<typeof api>;

describe('backend contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: [] } as any);
    mockedApi.post.mockResolvedValue({ data: {} } as any);
    mockedApi.patch.mockResolvedValue({ data: {} } as any);
    mockedApi.delete.mockResolvedValue({ data: {} } as any);
  });

  it('normalizes list payloads', () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
    expect(unwrapList({ count: 1, results: [3] })).toEqual([3]);
    expect(unwrapList(undefined)).toEqual([]);
  });

  it('uses authentication and profile routes', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { access: 'a', refresh: 'r', email: 'student@example.com' } } as any);
    await login('student@example.com', 'password');
    await signUp({ email: 'new@example.com', university_id: 'UI001', password: 'password' });
    await activateAccount('token');
    await getUserProfile(7);
    await updateUserProfile({ bio: 'Builder' });
    await uploadProfilePicture('file:///profile.jpg');
    await passwordChange('old-password', 'new-password');
    await logout();

    expect(mockedApi.post).toHaveBeenCalledWith('/login/', { email: 'student@example.com', password: 'password' });
    expect(mockedApi.post).toHaveBeenCalledWith('/userauth/register/', { email: 'new@example.com', university_id: 'UI001', password: 'password' });
    expect(mockedApi.post).toHaveBeenCalledWith('/userauth/activate/', { token: 'token' });
    expect(mockedApi.get).toHaveBeenCalledWith('/profiles/profile/7/');
    expect(mockedApi.patch).toHaveBeenCalledWith('/userauth/profile/update/', { bio: 'Builder' });
    expect(mockedApi.post).toHaveBeenCalledWith('/userauth/change-password/', { current_password: 'old-password', new_password: 'new-password' });
    expect(mockedApi.post).toHaveBeenCalledWith('/login/logout/', { refresh: 'refresh-token' });
  });

  it('uses post, comment and search routes', async () => {
    await getFeedPosts(2);
    await getFriendsFeed();
    await getPosts();
    await createPost('Campus update');
    await deletePost(4);
    await toggleLike(4);
    await repost(4, 'Sharing');
    await reportPost(4, 'Unsafe');
    await addComment(4, 'hello');
    await fetchCommentReplies(9);
    await replyToComment(9, 'reply');
    await searchUsers('Ada');
    await searchPosts('systems');

    expect(mockedApi.get).toHaveBeenCalledWith('/posts/all-feed/', { params: { page: 2, limit: 10 } });
    expect(mockedApi.post).toHaveBeenCalledWith('/posts/4/comment/', { content: 'hello' });
    expect(mockedApi.post).toHaveBeenCalledWith('/posts/comments/9/reply/', { content: 'reply' });
    expect(mockedApi.delete).toHaveBeenCalledWith('/posts/4/delete/');
  });

  it('uses connection, messaging and notification routes', async () => {
    await sendFriendRequest(8);
    await getFriendRequests();
    await getFriends();
    await acceptFriendRequest(6);
    await createConversation([8]);
    await fetchConversations();
    await fetchMessages(3);
    await sendMessage(3, 'Realtime hello');
    await markConversationRead(3);
    await fetchNotifications();
    await fetchUnreadNotificationCount();
    await markNotificationRead(5);
    await markAllNotificationsRead();

    expect(mockedApi.post).toHaveBeenCalledWith('/conversations/', { participants: [8] });
    expect(mockedApi.get).toHaveBeenCalledWith('/conversations/3/messages/');
    expect(mockedApi.post).toHaveBeenCalledWith('/conversations/3/send_message/', { content: 'Realtime hello' });
    expect(mockedApi.get).toHaveBeenCalledWith('/notifications/');
    expect(mockedApi.post).toHaveBeenCalledWith('/notifications/mark_all_read/');
  });

  it('uses call-room routes', async () => {
    await createRoom();
    await joinRoom('room-code');
    expect(mockedApi.post).toHaveBeenCalledWith('/call/create-room/');
    expect(mockedApi.post).toHaveBeenCalledWith('/call/join-room/room-code/');
  });
});
