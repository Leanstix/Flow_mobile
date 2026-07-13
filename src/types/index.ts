export type User = {
  id?: number;
  user_id?: number;
  email: string;
  user_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  university_id?: string | null;
  university_name?: string | null;
  department?: string | null;
  faculty?: string | null;
  year_of_study?: number | string | null;
  gender?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  profile_picture?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_friends?: boolean;
  conversation_id?: number | null;
};

export type Session = { access: string; refresh: string; user: User };
export type PostMedia = {
  id: number;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string | null;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  duration_seconds?: number | string | null;
  width?: number | null;
  height?: number | null;
  trim_start_seconds?: number | string;
  trim_end_seconds?: number | string | null;
  position: number;
};
export type Post = {
  id: number;
  user: User;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  has_liked: boolean;
  media?: PostMedia[];
  hashtags?: string[];
  mentions?: User[];
  reposted_from?: Post | null;
};
export type Comment = {
  id: number;
  post: number;
  parent?: number | null;
  root?: number | null;
  depth?: number;
  parent_preview?: { id: number; user: User; content: string } | null;
  user: User;
  content: string;
  created_at: string;
  replies_count: number;
  mentions?: User[];
};
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageAttachmentKind = 'image' | 'video' | 'audio' | 'document' | 'contact' | 'location' | 'listing';
export type MessageAttachment = {
  id: number;
  kind: MessageAttachmentKind;
  url?: string;
  thumbnail_url?: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  duration_seconds?: number | string | null;
  metadata?: Record<string, any>;
  position?: number;
  created_at?: string;
};
export type MessageReplyPreview = {
  id: number;
  sender: User;
  content: string;
  is_deleted: boolean;
  attachments?: MessageAttachment[];
};
export type Message = {
  id: number;
  conversation: number;
  sender: User;
  content: string;
  timestamp: string;
  reply_to?: number | null;
  reply_preview?: MessageReplyPreview | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean;
  status?: MessageStatus;
  recipient_count?: number;
  delivered_count?: number;
  read_count?: number;
  is_read: boolean;
  attachments?: MessageAttachment[];
};
export type MessageReceiptPayload = {
  message_id: number;
  status: MessageStatus;
  recipient_count: number;
  delivered_count: number;
  read_count: number;
  is_read: boolean;
};
export type FriendRequest = { id: number; from_user: User; to_user: User; timestamp: string; accepted: boolean };
export type Friend = User & { conversation_id?: number | null };
export type Conversation = { id: number; participants: User[]; created_at: string; name: string; last_message?: Message | null; unread_count: number };

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'rejected' | 'missed';
export type CallInvitationStatus = 'ringing' | 'accepted' | 'rejected' | 'left';
export type CallInvitation = { id: number; user: User; invited_by?: User | null; status: CallInvitationStatus; created_at: string; responded_at?: string | null };
export type CallSession = { id: number; room_name: string; created_by?: User | null; conversation_id?: number | null; call_type: CallType; status: CallStatus; participants: User[]; invitations: CallInvitation[]; created_at: string; started_at?: string | null; ended_at?: string | null };
export type CallSocketEvent = { type: string; call?: CallSession; accepted_by?: number; rejected_by?: number; ended_by?: number; user_id?: number };

export type Notification = { id: number; recipient: number; actor?: User | null; verb: string; message: string; target_post_id?: number | null; target_comment_id?: number | null; target_conversation_id?: number | null; is_read: boolean; created_at: string };

export type CommunityCategory = 'course' | 'interest' | 'project' | 'club';
export type CommunityVisibility = 'public' | 'private';
export type CommunityRole = 'owner' | 'moderator' | 'member';
export type CommunityMembershipStatus = 'active' | 'pending';
export type Community = { id: number; name: string; slug: string; description: string; category: CommunityCategory; visibility: CommunityVisibility; course_code?: string | null; cover_image?: string | null; owner: User; is_active: boolean; created_at: string; updated_at: string; active_members_count: number; posts_count: number; resources_count: number; membership_status?: CommunityMembershipStatus | null; membership_role?: CommunityRole | null; can_moderate: boolean };
export type CommunityMembership = { id: number; user: User; role: CommunityRole; status: CommunityMembershipStatus; joined_at: string };
export type CommunityPost = { id: number; community: number; author: User; content: string; attachment_url?: string | null; is_pinned: boolean; created_at: string; updated_at: string };
export type CommunityResource = { id: number; community: number; uploaded_by: User; title: string; description?: string | null; url: string; is_pinned: boolean; created_at: string };

export type MarketplaceCategory = 'books' | 'electronics' | 'fashion' | 'services' | 'accommodation' | 'food' | 'other';
export type MarketplaceCondition = 'new' | 'like_new' | 'used' | 'not_applicable';
export type MarketplaceStatus = 'active' | 'reserved' | 'sold' | 'archived';
export type MarketplaceImage = { id: number; image: string; position: number };
export type MarketplaceListing = { id: number; seller: User; title: string; description: string; price?: string | null; currency: string; category: MarketplaceCategory; condition: MarketplaceCondition; status: MarketplaceStatus; location?: string | null; image?: string | null; images: MarketplaceImage[]; views_count: number; saved_count: number; is_saved: boolean; is_owner: boolean; created_at: string; updated_at: string };

export type Paginated<T> = { count: number; next?: string | null; previous?: string | null; results: T[] };
