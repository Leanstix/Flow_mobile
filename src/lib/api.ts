import api from './http';
import { clearSession, getSessionSync, saveSession, updateStoredUser } from './session';
import type { Comment, Conversation, Friend, FriendRequest, Message, Notification, Paginated, Post, User } from '@/types';

export const unwrapList = <T>(payload: T[] | Paginated<T> | undefined): T[] => Array.isArray(payload) ? payload : payload?.results || [];
export async function login(email: string, password: string) { const { data } = await api.post('/login/', { email, password }); return saveSession(data); }
export async function logout() { const refresh = getSessionSync()?.refresh; try { if (refresh) await api.post('/login/logout/', { refresh }); } finally { await clearSession(); } }
export async function signUp(payload: { email: string; university_id: string; password: string }) { return (await api.post('/userauth/register/', payload)).data; }
export async function activateAccount(token: string) { return (await api.post('/userauth/activate/', { token })).data; }
export async function getUserProfile(id: number) { return (await api.get<User>(`/profiles/profile/${id}/`)).data; }
export async function updateUserProfile(payload: Partial<User>) { const { data } = await api.patch<User>('/userauth/profile/update/', payload); await updateStoredUser(data); return data; }
export async function uploadProfilePicture(uri: string, fileName = 'flow-profile.jpg', mimeType = 'image/jpeg') { const form = new FormData(); form.append('profile_picture', { uri, name: fileName, type: mimeType } as any); const { data } = await api.patch<User>('/userauth/profile/update/', form); await updateStoredUser(data); return data; }
export async function passwordChange(current_password: string, new_password: string) { return (await api.post('/userauth/change-password/', { current_password, new_password })).data; }
export async function requestPasswordReset(email: string) { return (await api.post('/reset-password/password-reset-request/', { email })).data; }
export async function resetPassword(uid: string, token: string, password: string) { return (await api.post('/reset-password/password-reset-complete/', { uid, token, password })).data; }
export async function getFeedPosts(page = 1) { return (await api.get<Paginated<Post>>('/posts/all-feed/', { params: { page, limit: 10 } })).data; }
export async function getFriendsFeed() { return (await api.get<Post[]>('/posts/feed/')).data; }
export async function getPosts() { return (await api.get<Post[]>('/posts/')).data; }
export async function createPost(content: string) { return (await api.post<Post>('/posts/', { content })).data; }
export async function deletePost(id: number) { return (await api.delete(`/posts/${id}/delete/`)).data; }
export async function toggleLike(id: number) { return (await api.post<{ liked: boolean; likes_count: number }>(`/posts/${id}/like/`)).data; }
export async function repost(id: number, content = '') { return (await api.post<Post>(`/posts/${id}/repost/`, content ? { content } : {})).data; }
export async function reportPost(id: number, reason: string) { return (await api.post(`/posts/${id}/report/`, { reason })).data; }
export async function fetchComments(id: number, page = 1) { return (await api.get<Paginated<Comment>>(`/posts/${id}/comments/`, { params: { page, limit: 20 } })).data; }
export async function addComment(id: number, content: string) { return (await api.post<Comment>(`/posts/${id}/comment/`, { content })).data; }
export async function fetchCommentReplies(id: number) { return (await api.get<Paginated<Comment>>(`/posts/comments/${id}/replies/`)).data; }
export async function replyToComment(id: number, content: string) { return (await api.post<Comment>(`/posts/comments/${id}/reply/`, { content })).data; }
export async function searchUsers(q: string) { return (await api.get<User[]>('/requests/search/', { params: { q } })).data; }
export async function searchPosts(q: string) { return (await api.get<Paginated<Post>>('/posts/search/not-by-user/', { params: { q } })).data; }
export async function sendFriendRequest(to_user_id: number) { return (await api.post('/requests/friend-requests/', { to_user_id })).data; }
export async function getFriendRequests() { return (await api.get<FriendRequest[]>('/requests/friend-requests/')).data; }
export async function getFriends() { return (await api.get<Friend[]>('/requests/friends/')).data; }
export async function acceptFriendRequest(id: number) { return (await api.patch(`/requests/friend-requests/${id}/`)).data; }
export async function createConversation(participants: number[]) { return (await api.post<Conversation>('/conversations/', { participants })).data; }
export async function fetchConversations() { return (await api.get<Conversation[]>('/conversations/')).data; }
export async function fetchMessages(id: number) { return (await api.get<Message[]>(`/conversations/${id}/messages/`)).data; }
export async function sendMessage(id: number, content: string) { return (await api.post<Message>(`/conversations/${id}/send_message/`, { content })).data; }
export async function markConversationRead(id: number) { return (await api.post(`/conversations/${id}/mark_read/`)).data; }
export async function fetchNotifications() { return (await api.get<Paginated<Notification> | Notification[]>('/notifications/')).data; }
export async function fetchUnreadNotificationCount() { return (await api.get<{ unread_count: number }>('/notifications/unread_count/')).data; }
export async function markNotificationRead(id: number) { return (await api.post(`/notifications/${id}/mark_read/`)).data; }
export async function markAllNotificationsRead() { return (await api.post('/notifications/mark_all_read/')).data; }
export async function createRoom() { return (await api.post<{ room_name: string }>('/call/create-room/')).data; }
export async function joinRoom(name: string) { return (await api.post(`/call/join-room/${name}/`)).data; }
