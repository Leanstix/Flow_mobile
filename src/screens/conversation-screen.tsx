import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Phone, Reply, Send, Trash2, Video, Wifi, WifiOff, X } from 'lucide-react-native';

import { MessageAttachmentPicker, type AttachmentSelection } from '@/components/message-attachment-picker';
import { attachmentSummary, MessageAttachments } from '@/components/message-attachments';
import {
  deleteMessage,
  editMessage,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendMessage,
  sendMessageAttachment,
  startDirectCall,
} from '@/lib/api';
import {
  applyMessageReceipt,
  deletedMessage,
  messageStatusLabel,
  upsertMessage,
  type ConversationSocketEvent,
} from '@/lib/message-lifecycle';
import { useConversationSocket } from '@/hooks/use-conversation-socket';
import { useAuthStore } from '@/state/auth-store';
import { colors, spacing } from '@/theme';
import { showApiError, showConfirm, showError } from '@/state/ui-store';
import type { CallType, Conversation, Message, User } from '@/types';

function senderName(message?: Message | null) {
  return message?.sender.user_name || message?.sender.email || 'Student';
}

function userId(user?: User | null) {
  return Number(user?.id || user?.user_id || 0);
}

function SwipeReply({ disabled, onReply, children }: { disabled: boolean; onReply: () => void; children: React.ReactNode }) {
  const ref = useRef<any>(null);
  return <Swipeable ref={ref} enabled={!disabled} friction={1.8} leftThreshold={42} overshootLeft={false} onSwipeableOpen={() => { ref.current?.close(); onReply(); }} renderLeftActions={() => <View style={styles.swipeReplyAction}><View style={styles.swipeReplyCircle}><Reply color="#fff" size={18} /></View></View>}>{children}</Swipeable>;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = Number(params.id);
  const currentId = useAuthStore((state) => state.session?.user.user_id || state.session?.user.id);
  const client = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [content, setContent] = useState('');
  const [typingLabel, setTypingLabel] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [calling, setCalling] = useState<CallType | null>(null);

  const messages = useQuery({ queryKey: ['messages', id], queryFn: () => fetchMessages(id), enabled: Number.isFinite(id) });
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });
  const conversation = (Array.isArray(conversations.data) ? conversations.data : []).find((item: Conversation) => item.id === id);
  const otherParticipants = conversation?.participants.filter((participant) => userId(participant) !== Number(currentId)) || [];
  const directPeer = otherParticipants.length === 1 ? otherParticipants[0] : null;
  const title = params.name || conversation?.name || directPeer?.user_name || directPeer?.email || 'Conversation';

  const startCall = useCallback(async (callType: CallType) => {
    if (!directPeer || !userId(directPeer)) {
      showError('Start from an individual chat', 'Direct calls begin with one person. Add more people after the call connects.');
      return;
    }
    setCalling(callType);
    try {
      const call = await startDirectCall(userId(directPeer), id, callType);
      router.push({ pathname: '/calls/[room]', params: { room: call.room_name, callType: call.call_type, host: '1', name: directPeer.user_name || directPeer.email } });
    } catch (error) {
      showApiError(error, `Could not start ${callType} call`);
    } finally {
      setCalling(null);
    }
  }, [directPeer, id]);

  const updateCachedMessage = useCallback((message: Message) => {
    client.setQueryData<Message[]>(['messages', id], (current = []) => upsertMessage(current, message));
  }, [client, id]);

  const onEvent = useCallback((event: ConversationSocketEvent) => {
    if (event.type === 'typing') {
      setTypingLabel(`${event.user_name || 'Student'} is typing…`);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingLabel(''), 1800);
      return;
    }
    if (event.type === 'error') {
      showError('Message could not be processed', event.error);
      return;
    }
    if (event.type === 'message.receipt') {
      client.setQueryData<Message[]>(['messages', id], (current = []) => applyMessageReceipt(current, event));
      return;
    }
    updateCachedMessage(event.message);
    void client.invalidateQueries({ queryKey: ['conversations'] });
    if (event.type === 'message.created' && userId(event.message.sender) !== Number(currentId)) void markConversationRead(id).catch(() => undefined);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, [client, currentId, id, updateCachedMessage]);

  const { connected, send, sendRead, sendTyping } = useConversationSocket(id, onEvent);

  useEffect(() => {
    if (!id) return;
    void markConversationRead(id).then(() => { sendRead(); return client.invalidateQueries({ queryKey: ['conversations'] }); }).catch(() => undefined);
  }, [client, connected, id, sendRead]);
  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  const sendFallback = useMutation({ mutationFn: ({ text, replyTo }: { text: string; replyTo?: number | null }) => sendMessage(id, text, replyTo), onSuccess: (message) => { updateCachedMessage(message); void client.invalidateQueries({ queryKey: ['conversations'] }); }, onError: (error) => showApiError(error, 'Could not send message') });
  const attachmentMutation = useMutation({
    mutationFn: (selection: AttachmentSelection) => sendMessageAttachment({ conversationId: id, content: content.trim(), replyTo: replyingTo?.id, ...selection }),
    onSuccess: (message) => {
      updateCachedMessage(message);
      setContent('');
      setReplyingTo(null);
      void client.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    },
    onError: (error) => showApiError(error, 'Could not send attachment'),
  });
  const editMutation = useMutation({ mutationFn: ({ messageId, text }: { messageId: number; text: string }) => editMessage(messageId, text), onSuccess: (message) => { updateCachedMessage(message); setEditing(null); setContent(''); }, onError: (error) => showApiError(error, 'Could not edit message') });
  const deleteMutation = useMutation({ mutationFn: (message: Message) => deleteMessage(message.id), onSuccess: (_, message) => { updateCachedMessage(deletedMessage({ ...message, attachments: [] })); if (editing?.id === message.id) { setEditing(null); setContent(''); } if (replyingTo?.id === message.id) setReplyingTo(null); void client.invalidateQueries({ queryKey: ['conversations'] }); }, onError: (error) => showApiError(error, 'Could not delete message') });

  const cancelComposerMode = () => { setEditing(null); setReplyingTo(null); setContent(''); };
  const beginReply = useCallback((message: Message) => { if (message.is_deleted || message.deleted_at) return; setEditing(null); setReplyingTo(message); setActionMessage(null); }, []);
  const beginEdit = (message: Message) => { setReplyingTo(null); setEditing(message); setContent(message.content); setActionMessage(null); };
  const confirmDelete = (message: Message) => { setActionMessage(null); showConfirm('Delete message?', 'This removes the message and all attachments for everyone, but keeps a deleted-message marker.', () => deleteMutation.mutate(message)); };
  const submit = () => {
    const text = content.trim();
    if (!text) return;
    if (editing) { editMutation.mutate({ messageId: editing.id, text }); return; }
    setContent('');
    const replyToId = replyingTo?.id || null;
    setReplyingTo(null);
    if (!send(text, replyToId)) sendFallback.mutate({ text, replyTo: replyToId });
  };

  const rows = Array.isArray(messages.data) ? messages.data : [];
  const busy = sendFallback.isPending || editMutation.isPending || attachmentMutation.isPending;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}>
    <Stack.Screen options={{ title, headerRight: () => <View style={styles.headerActions}><Pressable accessibilityLabel="Start audio call" disabled={Boolean(calling)} onPress={() => void startCall('audio')} style={styles.headerAction}><Phone color={calling === 'audio' ? colors.muted : colors.primary} size={21} /></Pressable><Pressable accessibilityLabel="Start video call" disabled={Boolean(calling)} onPress={() => void startCall('video')} style={styles.headerAction}><Video color={calling === 'video' ? colors.muted : colors.primary} size={22} /></Pressable></View> }} />
    <View style={styles.status}>{connected ? <Wifi color={colors.success} size={15} /> : <WifiOff color={colors.warning} size={15} />}<Text style={styles.statusText}>{connected ? 'Realtime connected' : 'Reconnecting — REST fallback active'}</Text></View>
    <FlatList ref={listRef} contentContainerStyle={styles.list} data={rows} keyExtractor={(item) => String(item.id)} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} renderItem={({ item }) => {
      const mine = userId(item.sender) === Number(currentId);
      const deleted = Boolean(item.is_deleted || item.deleted_at);
      return <SwipeReply disabled={deleted} onReply={() => beginReply(item)}><View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}><Pressable accessibilityHint={deleted ? undefined : 'Long press for message actions'} delayLongPress={350} disabled={deleted} onLongPress={() => setActionMessage(item)} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>{item.reply_preview ? <View style={[styles.replyPreview, mine && styles.replyPreviewMine]}><Text numberOfLines={1} style={[styles.replySender, mine && styles.mineMeta]}>{item.reply_preview.is_deleted ? 'Deleted message' : item.reply_preview.sender.user_name || item.reply_preview.sender.email}</Text><Text numberOfLines={2} style={[styles.replyText, mine && styles.mineMeta]}>{item.reply_preview.is_deleted ? 'This message was deleted.' : item.reply_preview.content || attachmentSummary(item.reply_preview.attachments)}</Text></View> : null}{!deleted ? <MessageAttachments attachments={item.attachments} mine={mine} /> : null}{item.content || deleted ? <Text style={[styles.message, mine && styles.mineText, deleted && styles.deletedText]}>{deleted ? 'This message was deleted.' : item.content}</Text> : null}<View style={styles.metaRow}><Text style={[styles.time, mine && styles.mineMeta]}>{item.edited_at && !deleted ? 'Edited · ' : ''}{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{mine && !deleted ? <Text style={[styles.time, styles.mineMeta]}>{messageStatusLabel(item)}</Text> : null}</View></Pressable></View></SwipeReply>;
    }} ListEmptyComponent={<Text style={styles.empty}>Start the conversation.</Text>} />
    {typingLabel ? <Text style={styles.typing}>{typingLabel}</Text> : null}
    {editing || replyingTo ? <View style={styles.composerContext}><View style={styles.contextBar} /><View style={styles.contextCopy}><Text style={styles.contextTitle}>{editing ? 'Editing message' : `Replying to ${senderName(replyingTo)}`}</Text><Text numberOfLines={1} style={styles.contextText}>{editing?.content || replyingTo?.content || attachmentSummary((editing || replyingTo)?.attachments)}</Text></View><Pressable accessibilityLabel="Cancel message action" onPress={cancelComposerMode} style={styles.contextClose}><X color={colors.muted} size={18} /></Pressable></View> : null}
    <View style={styles.composer}><MessageAttachmentPicker disabled={busy || Boolean(editing)} onSelect={(selection) => attachmentMutation.mutate(selection)} /><TextInput editable={!busy} maxLength={5000} multiline onChangeText={(value) => { setContent(value); if (!editing) sendTyping(); }} placeholder={editing ? 'Edit message…' : 'Write a message…'} placeholderTextColor={colors.muted} style={styles.input} value={content} /><Pressable accessibilityRole="button" disabled={!content.trim() || busy} onPress={submit} style={[styles.send, (!content.trim() || busy) && styles.sendDisabled]}>{editing ? <Pencil color="#fff" size={19} /> : <Send color="#fff" size={20} />}</Pressable></View>
    <Modal animationType="fade" onRequestClose={() => setActionMessage(null)} transparent visible={Boolean(actionMessage)}><Pressable onPress={() => setActionMessage(null)} style={styles.modalBackdrop}><Pressable onPress={(event) => event.stopPropagation()} style={styles.actionSheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Message actions</Text>{actionMessage ? <><Pressable onPress={() => beginReply(actionMessage)} style={styles.actionRow}><Reply color={colors.primary} size={20} /><Text style={styles.actionText}>Reply</Text></Pressable>{userId(actionMessage.sender) === Number(currentId) ? <><Pressable disabled={!actionMessage.content} onPress={() => beginEdit(actionMessage)} style={styles.actionRow}><Pencil color={actionMessage.content ? colors.primary : colors.muted} size={20} /><Text style={styles.actionText}>Edit message</Text></Pressable><Pressable onPress={() => confirmDelete(actionMessage)} style={styles.actionRow}><Trash2 color={colors.danger} size={20} /><Text style={[styles.actionText, styles.dangerText]}>Delete for everyone</Text></Pressable></> : null}</> : null}<Pressable onPress={() => setActionMessage(null)} style={styles.cancelAction}><Text style={styles.cancelText}>Cancel</Text></Pressable></Pressable></Pressable></Modal>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 }, headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }, statusText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, list: { padding: spacing.lg, flexGrow: 1, justifyContent: 'flex-end' }, swipeReplyAction: { width: 66, justifyContent: 'center', alignItems: 'center' }, swipeReplyCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, bubbleWrap: { marginVertical: 4, flexDirection: 'row' }, mineWrap: { justifyContent: 'flex-end' }, theirWrap: { justifyContent: 'flex-start' }, bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 }, mine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 }, theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 }, message: { color: colors.text, fontSize: 15, lineHeight: 21 }, mineText: { color: '#fff' }, deletedText: { fontStyle: 'italic', opacity: .78 }, replyPreview: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: '#EEF2FF', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 8 }, replyPreviewMine: { borderLeftColor: '#fff', backgroundColor: 'rgba(255,255,255,.14)' }, replySender: { color: colors.primary, fontSize: 11, fontWeight: '900' }, replyText: { color: colors.muted, fontSize: 11, marginTop: 2 }, metaRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 5 }, time: { color: colors.muted, fontSize: 10 }, mineMeta: { color: '#DDE4FF' }, empty: { color: colors.muted, textAlign: 'center', padding: 40 }, typing: { color: colors.muted, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#fff' }, composerContext: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border }, contextBar: { width: 3, alignSelf: 'stretch', borderRadius: 3, backgroundColor: colors.primary }, contextCopy: { flex: 1 }, contextTitle: { color: colors.primary, fontSize: 12, fontWeight: '900' }, contextText: { color: colors.muted, fontSize: 12, marginTop: 2 }, contextClose: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border }, input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 18, backgroundColor: colors.background, paddingHorizontal: 15, paddingVertical: 12, color: colors.text }, send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: .45 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.46)' }, actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }, sheetHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 }, sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 }, actionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, actionText: { color: colors.text, fontSize: 15, fontWeight: '700' }, dangerText: { color: colors.danger }, cancelAction: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 16, backgroundColor: colors.background }, cancelText: { color: colors.text, fontSize: 14, fontWeight: '800' } });
