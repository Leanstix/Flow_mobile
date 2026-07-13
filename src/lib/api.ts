import api from './http';
import { clearSession, getSessionSync, saveSession, updateStoredUser } from './session';
import type {
  CallSession,
  CallType,
  Comment,
  Community,
  CommunityMembership,
  CommunityPost,
  CommunityResource,
  Conversation,
  Friend,
  FriendRequest,
  MarketplaceListing,
  MarketplaceStatus,
  Message,
  MessageAttachmentKind,
  Notification,
  Paginated,
  Post,
  User,
} from '@/types';

export type NativeUpload = { uri: string; name: string; type: string };
export type PostMediaMetadata = { duration_seconds?: number; trim_start_seconds?: number; trim_end_seconds?: number };
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
export async function createPost(content: string, mentionUserIds: number[] = []) { return (await api.post<Post>('/posts/', { content, mention_user_ids: mentionUserIds })).data; }
export async function createPostWithMedia(content: string, files: NativeUpload[], metadata: PostMediaMetadata[] = [], mentionUserIds: number[] = []) {
  const form = new FormData();
  form.append('content', content);
  form.append('platform', 'mobile');
  form.append('mention_user_ids', JSON.stringify(mentionUserIds));
  files.forEach((file) => form.append('media', file as any));
  if (metadata.length) form.append('media_metadata', JSON.stringify(metadata));
  return (await api.post<Post>('/posts/', form)).data;
}
export async function deletePost(id: number) { return (await api.delete(`/posts/${id}/delete/`)).data; }
export async function toggleLike(id: number) { return (await api.post<{ liked: boolean; likes_count: number }>(`/posts/${id}/like/`)).data; }
export async function repost(id: number, content = '') { return (await api.post<Post>(`/posts/${id}/repost/`, content ? { content } : {})).data; }
export async function reportPost(id: number, reason: string) { return (await api.post(`/posts/${id}/report/`, { reason })).data; }
export async function fetchComments(id: number, page = 1) { return (await api.get<Paginated<Comment>>(`/posts/${id}/comments/`, { params: { page, limit: 30 } })).data; }
export async function addComment(id: number, content: string) { return (await api.post<Comment>(`/posts/${id}/comment/`, { content })).data; }
export async function fetchCommentReplies(id: number) { return (await api.get<Paginated<Comment>>(`/posts/comments/${id}/replies/`, { params: { limit: 100 } })).data; }
export async function replyToComment(id: number, content: string) { return (await api.post<Comment>(`/posts/comments/${id}/reply/`, { content })).data; }
export async function searchHashtags(q = '') { return (await api.get<{ name: string; posts_count: number }[]>('/posts/hashtags/', { params: { q: q.replace(/^#/, '') } })).data; }
export async function fetchHashtagPosts(tag: string, page = 1) { return (await api.get<Paginated<Post>>(`/posts/hashtags/${encodeURIComponent(tag.replace(/^#/, ''))}/`, { params: { page, limit: 10 } })).data; }
export async function searchMentionUsers(q = '') { return (await api.get<User[]>('/requests/search/', { params: { q: q.replace(/^@/, ''), context: 'mention' } })).data; }
export async function searchUsers(q: string) { return (await api.get<User[]>('/requests/search/', { params: { q: q.replace(/^@/, '') } })).data; }
export async function searchPosts(q: string) { return (await api.get<Paginated<Post>>('/posts/search/not-by-user/', { params: { q } })).data; }
export async function sendFriendRequest(to_user_id: number) { return (await api.post('/requests/friend-requests/', { to_user_id })).data; }
export async function getFriendRequests() { return (await api.get<FriendRequest[]>('/requests/friend-requests/')).data; }
export async function getFriends() { return (await api.get<Friend[]>('/requests/friends/')).data; }
export async function acceptFriendRequest(id: number) { return (await api.patch(`/requests/friend-requests/${id}/`)).data; }
export async function createConversation(participants: number[]) { return (await api.post<Conversation>('/conversations/', { participants })).data; }
export async function fetchConversations() { return (await api.get<Conversation[]>('/conversations/')).data; }
export async function fetchMessages(id: number) { return (await api.get<Message[]>(`/conversations/${id}/messages/`)).data; }
export async function sendMessage(id: number, content: string, replyTo?: number | null) { const payload: { content: string; reply_to?: number } = { content }; if (replyTo) payload.reply_to = replyTo; return (await api.post<Message>(`/conversations/${id}/send_message/`, payload)).data; }
export async function sendMessageAttachment(params: { conversationId: number; content?: string; replyTo?: number | null; kind: MessageAttachmentKind; files?: NativeUpload[]; payload?: Record<string, any>; durationSeconds?: number }) {
  const form = new FormData();
  form.append('content', params.content || '');
  form.append('attachment_type', params.kind);
  if (params.replyTo) form.append('reply_to', String(params.replyTo));
  if (params.payload) form.append('attachment_payload', JSON.stringify(params.payload));
  if (params.durationSeconds) form.append('attachment_duration_seconds', String(params.durationSeconds));
  (params.files || []).forEach((file) => form.append('files', file as any));
  return (await api.post<Message>(`/conversations/${params.conversationId}/send_message/`, form)).data;
}
export async function editMessage(id: number, content: string) { return (await api.patch<Message>(`/messages/${id}/`, { content })).data; }
export async function deleteMessage(id: number) { await api.delete(`/messages/${id}/`); }
export async function markConversationRead(id: number) { return (await api.post(`/conversations/${id}/mark_read/`)).data; }
export async function fetchNotifications() { return (await api.get<Paginated<Notification> | Notification[]>('/notifications/')).data; }
export async function fetchUnreadNotificationCount() { return (await api.get<{ unread_count: number }>('/notifications/unread_count/')).data; }
export async function markNotificationRead(id: number) { return (await api.post(`/notifications/${id}/mark_read/`)).data; }
export async function markAllNotificationsRead() { return (await api.post('/notifications/mark_all_read/')).data; }

export async function createRoom(callType: CallType = 'video') { return (await api.post<CallSession>('/call/create-room/', { call_type: callType })).data; }
export async function joinRoom(name: string) { return (await api.post<CallSession>(`/call/join-room/${name}/`)).data; }
export async function startDirectCall(recipientId: number, conversationId: number, callType: CallType) { return (await api.post<CallSession>('/call/direct/', { recipient_id: recipientId, conversation_id: conversationId, call_type: callType })).data; }
export async function fetchIncomingCalls() { return (await api.get<CallSession[]>('/call/incoming/')).data; }
export async function fetchCall(roomName: string) { return (await api.get<CallSession>(`/call/${roomName}/`)).data; }
export async function acceptCall(roomName: string) { return (await api.post<CallSession>(`/call/${roomName}/accept/`)).data; }
export async function rejectCall(roomName: string) { return (await api.post<CallSession>(`/call/${roomName}/reject/`)).data; }
export async function inviteCallParticipants(roomName: string, userIds: number[]) { return (await api.post<CallSession>(`/call/${roomName}/invite/`, { user_ids: userIds })).data; }
export async function leaveCall(roomName: string) { return (await api.post<{ detail: string; status: string }>(`/call/${roomName}/leave/`)).data; }

export type CommunityFilters = { q?: string; category?: string; course_code?: string; mine?: boolean };
export async function fetchCommunities(params: CommunityFilters = {}) { return (await api.get<Paginated<Community> | Community[]>('/groups/', { params })).data; }
export async function fetchCommunity(slug: string) { return (await api.get<Community>(`/groups/${slug}/`)).data; }
export async function createCommunity(payload: Partial<Community>) { return (await api.post<Community>('/groups/', payload)).data; }
export async function joinCommunity(slug: string) { return (await api.post<{ detail: string; status: string }>(`/groups/${slug}/join/`)).data; }
export async function leaveCommunity(slug: string) { return (await api.post(`/groups/${slug}/leave/`)).data; }
export async function fetchCommunityMembers(slug: string) { return (await api.get<CommunityMembership[]>(`/groups/${slug}/members/`)).data; }
export async function approveCommunityMember(slug: string, membershipId: number) { return (await api.post<CommunityMembership>(`/groups/${slug}/members/${membershipId}/approve/`)).data; }
export async function updateCommunityMemberRole(slug: string, membershipId: number, role: 'member' | 'moderator') { return (await api.patch<CommunityMembership>(`/groups/${slug}/members/${membershipId}/role/`, { role })).data; }
export async function fetchCommunityPosts(slug: string) { return (await api.get<CommunityPost[]>('/groups/posts/', { params: { community: slug } })).data; }
export async function createCommunityPost(payload: { community: number; content: string; attachment_url?: string }) { return (await api.post<CommunityPost>('/groups/posts/', payload)).data; }
export async function toggleCommunityPostPin(id: number) { return (await api.post<CommunityPost>(`/groups/posts/${id}/toggle_pin/`)).data; }
export async function deleteCommunityPost(id: number) { return (await api.delete(`/groups/posts/${id}/`)).data; }
export async function fetchCommunityResources(slug: string) { return (await api.get<CommunityResource[]>('/groups/resources/', { params: { community: slug } })).data; }
export async function createCommunityResource(payload: { community: number; title: string; description?: string; url: string }) { return (await api.post<CommunityResource>('/groups/resources/', payload)).data; }
export async function toggleCommunityResourcePin(id: number) { return (await api.post<CommunityResource>(`/groups/resources/${id}/toggle_pin/`)).data; }
export async function deleteCommunityResource(id: number) { return (await api.delete(`/groups/resources/${id}/`)).data; }

export type MarketplaceFilters = { q?: string; category?: string; condition?: string; status?: string; min_price?: string; max_price?: string; ordering?: string };
export async function fetchMarketplaceListings(params: MarketplaceFilters = {}) { return (await api.get<Paginated<MarketplaceListing> | MarketplaceListing[]>('/marketplace/listings/', { params })).data; }
export async function fetchMarketplaceListing(id: number | string) { return (await api.get<MarketplaceListing>(`/marketplace/listings/${id}/`)).data; }
export async function fetchMyMarketplaceListings() { return (await api.get<Paginated<MarketplaceListing> | MarketplaceListing[]>('/marketplace/listings/mine/')).data; }
export async function fetchSavedMarketplaceListings() { return (await api.get<Paginated<MarketplaceListing> | MarketplaceListing[]>('/marketplace/listings/saved/')).data; }
export async function createMarketplaceListing(form: FormData) { return (await api.post<MarketplaceListing>('/marketplace/listings/', form)).data; }
export async function updateMarketplaceListing(id: number, payload: Partial<MarketplaceListing> | FormData) { return (await api.patch<MarketplaceListing>(`/marketplace/listings/${id}/`, payload)).data; }
export async function archiveMarketplaceListing(id: number) { return (await api.delete(`/marketplace/listings/${id}/`)).data; }
export async function saveMarketplaceListing(id: number) { return (await api.post<{ saved: boolean }>(`/marketplace/listings/${id}/save_listing/`)).data; }
export async function unsaveMarketplaceListing(id: number) { return (await api.delete(`/marketplace/listings/${id}/unsave/`)).data; }
export async function reportMarketplaceListing(id: number, reason: string) { return (await api.post(`/marketplace/listings/${id}/report/`, { reason })).data; }
export async function setMarketplaceListingStatus(id: number, status: MarketplaceStatus) { return (await api.post<MarketplaceListing>(`/marketplace/listings/${id}/set_status/`, { status })).data; }
export async function contactMarketplaceSeller(id: number, message = '') { return (await api.post<{ conversation: Conversation; message: Message }>(`/marketplace/listings/${id}/contact_seller/`, { message })).data; }
