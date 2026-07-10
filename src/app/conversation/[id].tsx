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
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Reply, Send, Trash2, Wifi, WifiOff, X } from 'lucide-react-native';
import { deleteMessage, editMessage, fetchMessages, markConversationRead, sendMessage } from '@/lib/api';
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
import type { Message } from '@/types';

function senderName(message: Message) {
  return message.sender.user_name || message.sender.email || 'Student';
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

  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => fetchMessages(id),
    enabled: Number.isFinite(id),
  });

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
    if (event.type === 'message.created' && Number(event.message.sender.id || event.message.sender.user_id) !== Number(currentId)) {
      void markConversationRead(id).catch(() => undefined);
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, [client, currentId, id, updateCachedMessage]);

  const { connected, send, sendRead, sendTyping } = useConversationSocket(id, onEvent);

  useEffect(() => {
    if (!id) return;
    void markConversationRead(id)
      .then(() => {
        sendRead();
        return client.invalidateQueries({ queryKey: ['conversations'] });
      })
      .catch(() => undefined);
  }, [client, connected, id, sendRead]);

  useEffect(() => () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);

  const sendFallback = useMutation({
    mutationFn: ({ text, replyTo }: { text: string; replyTo?: number | null }) => sendMessage(id, text, replyTo),
    onSuccess: (message) => {
      updateCachedMessage(message);
      void client.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => showApiError(error, 'Could not send message'),
  });

  const editMutation = useMutation({
    mutationFn: ({ messageId, text }: { messageId: number; text: string }) => editMessage(messageId, text),
    onSuccess: (message) => {
      updateCachedMessage(message);
      setEditing(null);
      setContent('');
    },
    onError: (error) => showApiError(error, 'Could not edit message'),
  });

  const deleteMutation = useMutation({
    mutationFn: (message: Message) => deleteMessage(message.id),
    onSuccess: (_, message) => {
      updateCachedMessage(deletedMessage(message));
      if (editing?.id === message.id) {
        setEditing(null);
        setContent('');
      }
      if (replyingTo?.id === message.id) setReplyingTo(null);
      void client.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => showApiError(error, 'Could not delete message'),
  });

  const cancelComposerMode = () => {
    setEditing(null);
    setReplyingTo(null);
    setContent('');
  };

  const beginReply = (message: Message) => {
    setEditing(null);
    setReplyingTo(message);
    setActionMessage(null);
  };

  const beginEdit = (message: Message) => {
    setReplyingTo(null);
    setEditing(message);
    setContent(message.content);
    setActionMessage(null);
  };

  const confirmDelete = (message: Message) => {
    setActionMessage(null);
    showConfirm('Delete message?', 'This removes the message for everyone, but keeps a deleted-message marker in the conversation.', () => deleteMutation.mutate(message));
  };

  const submit = () => {
    const text = content.trim();
    if (!text) return;

    if (editing) {
      editMutation.mutate({ messageId: editing.id, text });
      return;
    }

    setContent('');
    const replyToId = replyingTo?.id || null;
    setReplyingTo(null);
    if (!send(text, replyToId)) sendFallback.mutate({ text, replyTo: replyToId });
  };

  const rows = Array.isArray(messages.data) ? messages.data : [];
  const busy = sendFallback.isPending || editMutation.isPending;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}>
      <View style={styles.status}>
        {connected ? <Wifi color={colors.success} size={15} /> : <WifiOff color={colors.warning} size={15} />}
        <Text style={styles.statusText}>{connected ? 'Realtime connected' : 'Reconnecting — REST fallback active'}</Text>
      </View>

      <FlatList
        ref={listRef}
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = Number(item.sender.id || item.sender.user_id) === Number(currentId);
          const deleted = Boolean(item.is_deleted || item.deleted_at);
          return (
            <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}>
              <Pressable
                accessibilityHint={deleted ? undefined : 'Long press for message actions'}
                delayLongPress={350}
                disabled={deleted}
                onLongPress={() => setActionMessage(item)}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                {item.reply_preview ? (
                  <View style={[styles.replyPreview, mine && styles.replyPreviewMine]}>
                    <Text numberOfLines={1} style={[styles.replySender, mine && styles.mineMeta]}>{item.reply_preview.is_deleted ? 'Deleted message' : item.reply_preview.sender.user_name || item.reply_preview.sender.email}</Text>
                    <Text numberOfLines={2} style={[styles.replyText, mine && styles.mineMeta]}>{item.reply_preview.is_deleted ? 'This message was deleted.' : item.reply_preview.content}</Text>
                  </View>
                ) : null}
                <Text style={[styles.message, mine && styles.mineText, deleted && styles.deletedText]}>{deleted ? 'This message was deleted.' : item.content}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.time, mine && styles.mineMeta]}>
                    {item.edited_at && !deleted ? 'Edited · ' : ''}{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {mine && !deleted ? <Text style={[styles.time, styles.mineMeta]}>{messageStatusLabel(item)}</Text> : null}
                </View>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Start the conversation.</Text>}
      />

      {typingLabel ? <Text style={styles.typing}>{typingLabel}</Text> : null}

      {editing || replyingTo ? (
        <View style={styles.composerContext}>
          <View style={styles.contextBar} />
          <View style={styles.contextCopy}>
            <Text style={styles.contextTitle}>{editing ? 'Editing message' : `Replying to ${senderName(replyingTo as Message)}`}</Text>
            <Text numberOfLines={1} style={styles.contextText}>{editing?.content || replyingTo?.content}</Text>
          </View>
          <Pressable accessibilityLabel="Cancel message action" onPress={cancelComposerMode} style={styles.contextClose}><X color={colors.muted} size={18} /></Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          editable={!busy}
          maxLength={5000}
          multiline
          onChangeText={(value) => {
            setContent(value);
            if (!editing) sendTyping();
          }}
          placeholder={editing ? 'Edit message…' : 'Write a message…'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={content}
        />
        <Pressable accessibilityRole="button" disabled={!content.trim() || busy} onPress={submit} style={[styles.send, (!content.trim() || busy) && styles.sendDisabled]}>
          {editing ? <Pencil color="#fff" size={19} /> : <Send color="#fff" size={20} />}
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setActionMessage(null)} transparent visible={Boolean(actionMessage)}>
        <Pressable onPress={() => setActionMessage(null)} style={styles.modalBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Message actions</Text>
            {actionMessage ? (
              <>
                <Pressable onPress={() => beginReply(actionMessage)} style={styles.actionRow}><Reply color={colors.primary} size={20} /><Text style={styles.actionText}>Reply</Text></Pressable>
                {Number(actionMessage.sender.id || actionMessage.sender.user_id) === Number(currentId) ? (
                  <>
                    <Pressable onPress={() => beginEdit(actionMessage)} style={styles.actionRow}><Pencil color={colors.primary} size={20} /><Text style={styles.actionText}>Edit message</Text></Pressable>
                    <Pressable onPress={() => confirmDelete(actionMessage)} style={styles.actionRow}><Trash2 color={colors.danger} size={20} /><Text style={[styles.actionText, styles.dangerText]}>Delete for everyone</Text></Pressable>
                  </>
                ) : null}
              </>
            ) : null}
            <Pressable onPress={() => setActionMessage(null)} style={styles.cancelAction}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border },
  statusText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  list: { padding: spacing.lg, flexGrow: 1, justifyContent: 'flex-end' },
  bubbleWrap: { marginVertical: 4, flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-end' },
  theirWrap: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  message: { color: colors.text, fontSize: 15, lineHeight: 21 },
  mineText: { color: '#fff' },
  deletedText: { fontStyle: 'italic', opacity: 0.78 },
  replyPreview: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: '#EEF2FF', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, marginBottom: 8 },
  replyPreviewMine: { borderLeftColor: '#fff', backgroundColor: 'rgba(255,255,255,0.14)' },
  replySender: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  replyText: { color: colors.muted, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 5 },
  time: { color: colors.muted, fontSize: 10 },
  mineMeta: { color: '#DDE4FF' },
  empty: { color: colors.muted, textAlign: 'center', padding: 40 },
  typing: { color: colors.muted, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#fff' },
  composerContext: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  contextBar: { width: 3, alignSelf: 'stretch', borderRadius: 3, backgroundColor: colors.primary },
  contextCopy: { flex: 1 },
  contextTitle: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  contextText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  contextClose: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 18, backgroundColor: colors.background, paddingHorizontal: 15, paddingVertical: 12, color: colors.text },
  send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.46)' },
  actionSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  sheetHandle: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  actionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dangerText: { color: colors.danger },
  cancelAction: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 16, backgroundColor: colors.background },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: '800' },
});