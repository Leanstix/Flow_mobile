import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CornerDownRight, Send } from 'lucide-react-native';
import { addComment, fetchCommentReplies, fetchComments, replyToComment, unwrapList } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { colors, spacing } from '@/theme';
import { showApiError } from '@/state/ui-store';
import type { Comment } from '@/types';

function CommentRow({ item, onReply }: { item: Comment; onReply: (comment: Comment) => void }) {
  const replies = useQuery({ queryKey: ['comment-replies', item.id], queryFn: () => fetchCommentReplies(item.id), enabled: false });
  const name = item.user.user_name || item.user.email;
  return <View style={styles.comment}><Avatar user={item.user} size={38} /><View style={{ flex: 1 }}><Text style={styles.commentName}>{name}</Text><Text style={styles.commentText}>{item.content}</Text><View style={styles.commentActions}><Pressable onPress={() => onReply(item)}><Text style={styles.reply}>Reply</Text></Pressable>{item.replies_count > 0 ? <Pressable onPress={() => replies.refetch()}><Text style={styles.reply}>View {item.replies_count} repl{item.replies_count === 1 ? 'y' : 'ies'}</Text></Pressable> : null}</View>{unwrapList(replies.data).map((reply) => <View key={reply.id} style={styles.nested}><CornerDownRight color={colors.muted} size={15} /><View style={{ flex: 1 }}><Text style={styles.commentName}>{reply.user.user_name || reply.user.email}</Text><Text style={styles.commentText}>{reply.content}</Text></View></View>)}</View></View>;
}

export default function DiscussionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const [replying, setReplying] = useState<Comment | null>(null);
  const query = useQuery({ queryKey: ['comments', id], queryFn: () => fetchComments(id), enabled: Number.isFinite(id) });
  const submitMutation = useMutation({ mutationFn: (text: string) => replying ? replyToComment(replying.id, text) : addComment(id, text), onSuccess: () => { setContent(''); setReplying(null); client.invalidateQueries({ queryKey: ['comments', id] }); if (replying) client.invalidateQueries({ queryKey: ['comment-replies', replying.id] }); }, onError: (e) => showApiError(e, 'Could not publish comment') });
  const submit = () => { const text = content.trim(); if (text) submitMutation.mutate(text); };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}><FlatList contentContainerStyle={styles.list} data={unwrapList(query.data)} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <CommentRow item={item} onReply={setReplying} />} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} ListEmptyComponent={<Text style={styles.empty}>No comments yet. Add the first response.</Text>} /><View style={styles.composer}>{replying ? <View style={styles.replying}><Text style={styles.replyingText}>Replying to @{replying.user.user_name || 'student'}</Text><Pressable onPress={() => setReplying(null)}><Text style={styles.cancel}>Cancel</Text></Pressable></View> : null}<View style={styles.row}><TextInput multiline onChangeText={setContent} placeholder={replying ? 'Write a reply…' : 'Add a comment…'} placeholderTextColor={colors.muted} style={styles.input} value={content} /><Pressable onPress={submit} style={styles.send}><Send color="#fff" size={18} /></Pressable></View></View></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, list: { padding: spacing.lg, flexGrow: 1 }, comment: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, commentName: { color: colors.text, fontWeight: '800', fontSize: 13 }, commentText: { color: colors.text, marginTop: 5, lineHeight: 20 }, commentActions: { flexDirection: 'row', gap: 18, marginTop: 8 }, reply: { color: colors.primary, fontWeight: '800', fontSize: 12 }, nested: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }, empty: { color: colors.muted, textAlign: 'center', padding: 50 }, composer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border }, replying: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 }, replyingText: { color: colors.muted, fontSize: 12 }, cancel: { color: colors.danger, fontWeight: '800', fontSize: 12 }, row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' }, input: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 16, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12, color: colors.text }, send: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' } });
