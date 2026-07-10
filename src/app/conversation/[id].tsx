import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Wifi, WifiOff } from 'lucide-react-native';
import { fetchMessages, markConversationRead, sendMessage } from '@/lib/api';
import { useConversationSocket } from '@/hooks/use-conversation-socket';
import { useAuthStore } from '@/state/auth-store';
import { colors, spacing } from '@/theme';
import { showApiError } from '@/state/ui-store';
import type { Message } from '@/types';

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = Number(params.id);
  const currentId = useAuthStore((s) => s.session?.user.user_id || s.session?.user.id);
  const client = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const [content, setContent] = useState('');
  const [typingLabel, setTypingLabel] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messages = useQuery({ queryKey: ['messages', id], queryFn: () => fetchMessages(id), enabled: Number.isFinite(id) });
  const onMessage = useCallback((message: Message) => {
    client.setQueryData<Message[]>(['messages', id], (current = []) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    void markConversationRead(id).then(() => client.invalidateQueries({ queryKey: ['conversations'] })).catch(() => undefined);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, [client, id]);
  const onTyping = useCallback((payload: { user_name?: string | null }) => { setTypingLabel(`${payload.user_name || 'Student'} is typing…`); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTypingLabel(''), 1800); }, []);
  const socket = useConversationSocket(id, onMessage, onTyping);
  const rest = useMutation({ mutationFn: (text: string) => sendMessage(id, text), onSuccess: onMessage, onError: (e) => showApiError(e, 'Could not send message') });
  useEffect(() => { if (id) void markConversationRead(id).then(() => client.invalidateQueries({ queryKey: ['conversations'] })).catch(() => undefined); }, [client, id]);
  const submit = () => {
    const text = content.trim();
    if (!text) return;
    setContent('');
    if (!socket.send(text)) rest.mutate(text);
  };
  const rows = Array.isArray(messages.data) ? messages.data : [];
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}><View style={styles.status}>{socket.connected ? <Wifi color={colors.success} size={15} /> : <WifiOff color={colors.warning} size={15} />}<Text style={styles.statusText}>{socket.connected ? 'Realtime connected' : 'Reconnecting — REST fallback active'}</Text></View><FlatList ref={listRef} contentContainerStyle={styles.list} data={rows} keyExtractor={(item) => String(item.id)} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} renderItem={({ item }) => { const mine = (item.sender.id || item.sender.user_id) === currentId; return <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}><View style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.message, mine && { color: '#fff' }]}>{item.content}</Text><Text style={[styles.time, mine && { color: '#DDE4FF' }]}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View></View>; }} ListEmptyComponent={<Text style={styles.empty}>Start the conversation.</Text>} />{typingLabel ? <Text style={styles.typing}>{typingLabel}</Text> : null}<View style={styles.composer}><TextInput multiline onChangeText={(value) => { setContent(value); socket.sendTyping(); }} placeholder="Write a message…" placeholderTextColor={colors.muted} style={styles.input} value={content} /><Pressable accessibilityRole="button" onPress={submit} style={styles.send}><Send color="#fff" size={20} /></Pressable></View></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }, statusText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, list: { padding: spacing.lg, flexGrow: 1, justifyContent: 'flex-end' }, bubbleWrap: { marginVertical: 4, flexDirection: 'row' }, mineWrap: { justifyContent: 'flex-end' }, theirWrap: { justifyContent: 'flex-start' }, bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 }, mine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 }, theirs: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 }, message: { color: colors.text, fontSize: 15, lineHeight: 21 }, time: { color: colors.muted, fontSize: 10, marginTop: 5, alignSelf: 'flex-end' }, empty: { color: colors.muted, textAlign: 'center', padding: 40 }, typing: { color: colors.muted, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 5, backgroundColor: '#fff' }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border }, input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 18, backgroundColor: colors.background, paddingHorizontal: 15, paddingVertical: 12, color: colors.text }, send: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' } });
