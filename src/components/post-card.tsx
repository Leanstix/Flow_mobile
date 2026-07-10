import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, MessageCircle, MoreHorizontal, Repeat2 } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Avatar } from './avatar';
import { Card } from './ui';
import { colors } from '@/theme';
import { deletePost, reportPost, repost, toggleLike } from '@/lib/api';
import { showApiError, showConfirm, showSuccess } from '@/state/ui-store';
import { useAuthStore } from '@/state/auth-store';
import type { Post } from '@/types';

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.session?.user.user_id || state.session?.user.id);
  const like = useMutation({ mutationFn: () => toggleLike(post.id), onMutate: async () => {
    const update = (value: any): any => Array.isArray(value) ? value.map(p => p.id === post.id ? { ...p, has_liked: !p.has_liked, likes_count: p.likes_count + (p.has_liked ? -1 : 1) } : p) : value?.pages ? { ...value, pages: value.pages.map(update) } : value?.results ? { ...value, results: update(value.results) } : value;
    queryClient.setQueriesData({ queryKey: ['feed'] }, update);
  }, onError: (e) => showApiError(e, 'Could not update like'), onSettled: () => queryClient.invalidateQueries({ queryKey: ['feed'] }) });
  const repostMutation = useMutation({ mutationFn: () => repost(post.id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['feed'] }); showSuccess('Reposted', 'The post is now visible on your profile.'); }, onError: (e) => showApiError(e, 'Could not repost') });
  const openActions = () => { const ownPost = (post.user.id || post.user.user_id) === currentUserId; if (ownPost) { showConfirm('Delete post?', 'This removes the post and its discussion permanently.', () => { void deletePost(post.id).then(() => { queryClient.invalidateQueries({ queryKey: ['feed'] }); queryClient.invalidateQueries({ queryKey: ['posts'] }); showSuccess('Post deleted', 'The post has been removed from Flow.'); }).catch((error) => showApiError(error, 'Could not delete post')); }); } else { showConfirm('Report this post?', 'Send this post to moderation as inappropriate or unsafe content.', () => { void reportPost(post.id, 'Inappropriate or unsafe content').then(() => showSuccess('Report submitted', 'The moderation record has been created.')).catch((error) => showApiError(error, 'Could not report post')); }); } };
  const name = [post.user.first_name, post.user.last_name].filter(Boolean).join(' ') || post.user.user_name || post.user.email;
  return <Card style={styles.card}><View style={styles.header}><Avatar user={post.user} /><View style={styles.identity}><Text style={styles.name}>{name}</Text><Text style={styles.handle}>@{post.user.user_name || 'student'} · {new Date(post.created_at).toLocaleDateString()}</Text></View><Pressable accessibilityLabel="Post actions" onPress={openActions}><MoreHorizontal color={colors.muted} size={20} /></Pressable></View>{post.reposted_from ? <View style={styles.repostBox}><Text style={styles.repostLabel}>Reposted from @{post.reposted_from.user?.user_name || 'student'}</Text><Text style={styles.repostText}>{post.reposted_from.content}</Text></View> : null}<Text style={styles.content}>{post.content}</Text><View style={styles.actions}><Pressable onPress={() => like.mutate()} style={styles.action}><Heart color={post.has_liked ? colors.danger : colors.muted} fill={post.has_liked ? colors.danger : 'transparent'} size={20} /><Text style={styles.count}>{post.likes_count}</Text></Pressable><Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: String(post.id), post: JSON.stringify(post) } })} style={styles.action}><MessageCircle color={colors.muted} size={20} /><Text style={styles.count}>{post.comments_count}</Text></Pressable><Pressable onPress={() => repostMutation.mutate()} style={styles.action}><Repeat2 color={colors.muted} size={20} /><Text style={styles.count}>{post.reposts_count}</Text></Pressable></View></Card>;
}
const styles = StyleSheet.create({ card: { gap: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 11 }, identity: { flex: 1 }, name: { color: colors.text, fontWeight: '800', fontSize: 15 }, handle: { color: colors.muted, fontSize: 12, marginTop: 2 }, content: { color: colors.text, fontSize: 15, lineHeight: 23 }, actions: { flexDirection: 'row', gap: 26, paddingTop: 4 }, action: { flexDirection: 'row', alignItems: 'center', gap: 7 }, count: { color: colors.muted, fontWeight: '700', fontSize: 13 }, repostBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, backgroundColor: '#F8FAFC' }, repostLabel: { color: colors.primary, fontSize: 12, fontWeight: '800' }, repostText: { color: colors.text, marginTop: 5, lineHeight: 20 } });
