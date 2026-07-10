export type User = {
  id?: number;
  user_id?: number;
  email: string;
  user_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  university_id?: string | null;
  department?: string | null;
  year_of_study?: number | string | null;
  gender?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  profile_picture?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
};

export type Session = { access: string; refresh: string; user: User };
export type Post = {
  id: number;
  user: User;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  has_liked: boolean;
  reposted_from?: Post | null;
};
export type Comment = { id: number; post: number; parent?: number | null; user: User; content: string; created_at: string; replies_count: number };
export type Message = { id: number; conversation: number; sender: User; content: string; timestamp: string; is_read: boolean };
export type FriendRequest = { id: number; from_user: User; to_user: User; timestamp: string; accepted: boolean };
export type Friend = User & { conversation_id?: number | null };
export type Conversation = { id: number; participants: User[]; created_at: string; name: string; last_message?: Message | null; unread_count: number };
export type Notification = { id: number; actor?: User | null; verb: string; message: string; target_post_id?: number | null; target_comment_id?: number | null; target_conversation_id?: number | null; is_read: boolean; created_at: string };
export type Paginated<T> = { count: number; next?: string | null; previous?: string | null; results: T[] };
