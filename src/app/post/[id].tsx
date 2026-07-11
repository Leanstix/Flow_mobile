import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Send } from 'lucide-react-native';

import { addComment, fetchCommentReplies, fetchComments, replyToComment, unwrapList } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { RichText } from '@/components/rich-text';
import { buildCommentTree, cappedIndent, type CommentNode } from '@/lib/comment-thread';
import { colors, spacing } from '@/theme';
import { showApiError } from '@/state/ui-store';
import type { Comment } from '@/types';

function ThreadNode({ node, onReply }: { node: CommentNode; onReply: (comment: Comment) => void }) {
  return <View style={{ marginLeft: cappedIndent(node.depth) }}><View style={styles.comment}><Avatar user={node.user} size={36} /><View style={{ flex: 1 }}>{node.parent_preview ? <Text numberOfLines={1} style={styles.parentPreview}>Replying to @{node.parent_preview.user.user_name || 'student'}</Text> : null}<Text style={styles.commentName}>{node.user.user_name || node.user.email}</Text><RichText style={styles.commentText} value={node.content} /><Pressable onPress={() => onReply(node)}><Text style={styles.reply}>Reply</Text></Pressable></View></View>{node.children.map((child) => <ThreadNode key={child.id} node={child} onReply={onReply} />)}</View>;
}

function RootThread({ root, onReply }: { root: Comment; onReply: (comment: Comment) => void }) {
  const [open, setOpen] = useState(false);
  const replies = useQuery({ queryKey: ['comment-thread', root.id], queryFn: () => fetchCommentReplies(root.id), enabled: open });
  const tree = useMemo(() => buildCommentTree([root, ...unwrapList(replies.data)]), [replies.data, root]);
  return <View style={styles.thread}><ThreadNode node={{ ...(tree[0] || root), children: open ? tree[0]?.children || [] : [] }} onReply={onReply} />{root.replies_count > 0 ? <Pressable onPress={() => setOpen((value) => !value)} style={styles.threadToggle}>{open ? <ChevronUp color={colors.primary} size={16} /> : <ChevronDown color={colors.primary} size={16} />}<Text style={styles.threadToggleText}>{open ? 'Hide thread' : `View ${root.replies_count} ${root.replies_count === 1 ? 'reply' : 'replies'}`}</Text></Pressable> : null}{open && replies.isLoading ? <Text style={styles.loading}>Loading thread…</Text> : null}</View>;
}

export default function DiscussionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const [replying, setReplying] = useState<Comment | null>(null);
  const query = useQuery({ queryKey: ['comments', id], queryFn: () => fetchComments(id), enabled: Number.isFinite(id) });
  const submitMutation = useMutation({ mutationFn: (text: string) => replying ? replyToComment(replying.id, text) : addComment(id, text), onSuccess: (created) => { setContent(''); const rootId = created.root || created.id; setReplying(null); client.invalidateQueries({ queryKey: ['comments', id] }); client.invalidateQueries({ queryKey: ['comment-thread', rootId] }); client.invalidateQueries({ queryKey: ['feed'] }); }, onError: (error) => showApiError(error, 'Could not publish comment') });
  const startReply = (comment: Comment) => { setReplying(comment); setContent(`@${comment.user.user_name || ''} `); };
  const submit = () => { const text = content.trim(); if (text) submitMutation.mutate(text); };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}><FlatList contentContainerStyle={styles.list} data={unwrapList(query.data)} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <RootThread root={item} onReply={startReply} />} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} ListEmptyComponent={<Text style={styles.empty}>No comments yet. Add the first response.</Text>} /><View style={styles.composer}>{replying ? <View style={styles.replying}><View><Text style={styles.replyingText}>Replying to @{replying.user.user_name || 'student'}</Text><Text numberOfLines={1} style={styles.replyingPreview}>{replying.content}</Text></View><Pressable onPress={() => { setReplying(null); setContent(''); }}><Text style={styles.cancel}>Cancel</Text></Pressable></View> : null}<View style={styles.row}><TextInput maxLength={5000} multiline onChangeText={setContent} placeholder={replying ? 'Write a reply…' : 'Add a comment, #topic or @mention…'} placeholderTextColor={colors.muted} style={styles.input} value={content} /><Pressable disabled={!content.trim() || submitMutation.isPending} onPress={submit} style={[styles.send, (!content.trim() || submitMutation.isPending) && { opacity: .45 }]}><Send color="#fff" size={18} /></Pressable></View></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, list: { padding: spacing.lg, flexGrow: 1 }, thread: { gap: 4 }, comment: { flexDirection: 'row', gap: 10, padding: 14, marginTop: 7, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, commentName: { color: colors.text, fontWeight: '800', fontSize: 13 }, commentText: { color: colors.text, marginTop: 5, lineHeight: 20 }, parentPreview: { color: colors.muted, fontSize: 10, marginBottom: 3 }, reply: { color: colors.primary, fontWeight: '800', fontSize: 12, marginTop: 8 }, threadToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 48, paddingVertical: 7 }, threadToggleText: { color: colors.primary, fontWeight: '800', fontSize: 12 }, loading: { color: colors.muted, fontSize: 11, marginLeft: 50 }, empty: { color: colors.muted, textAlign: 'center', padding: 50 }, composer: { padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border }, replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 }, replyingText: { color: colors.primary, fontWeight: '800', fontSize: 12 }, replyingPreview: { color: colors.muted, fontSize: 11, maxWidth: 260, marginTop: 2 }, cancel: { color: colors.danger, fontWeight: '800', fontSize: 12 }, row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' }, input: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 16, backgroundColor: colors.background, paddingHorizontal: 14, paddingVertical: 12, color: colors.text }, send: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' } });
