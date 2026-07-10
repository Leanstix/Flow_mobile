import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { fetchConversations } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/state/auth-store';
import { usePreferencesStore } from '@/state/preferences-store';
import type { Conversation, User } from '@/types';

export default function MessagesScreen() {
  const currentId = useAuthStore((s) => s.session?.user.user_id || s.session?.user.id);
  const previews = usePreferencesStore((s) => s.messagePreviews);
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations, refetchInterval: 30_000 });
  const rows = Array.isArray(conversations.data) ? conversations.data : [];
  const other = (item: Conversation): User | undefined => item.participants.find((p) => (p.id || p.user_id) !== currentId);
  return <View style={styles.root}><View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.title}>Messages</Text><Text style={styles.subtitle}>Private realtime conversations with your classmates.</Text></View><Pressable accessibilityLabel="Open calls" onPress={() => router.push('/calls')} style={styles.callButton}><Phone color={colors.primary} size={20} /></Pressable></View><FlatList contentContainerStyle={styles.list} data={rows} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={conversations.isRefetching} onRefresh={conversations.refetch} tintColor={colors.primary} />} renderItem={({ item }) => { const participant = other(item); return <Pressable onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: String(item.id), name: item.name } })}><Card style={styles.row}><Avatar user={participant} size={52} /><View style={{ flex: 1 }}><View style={styles.nameRow}><Text style={styles.name}>{item.name || participant?.user_name || participant?.email || 'Conversation'}</Text>{item.unread_count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View> : null}</View>{previews ? <Text numberOfLines={1} style={styles.preview}>{item.last_message?.content || 'Start the conversation'}</Text> : <Text style={styles.preview}>Message preview hidden</Text>}</View></Card></Pressable>; }} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Text style={styles.empty}>No conversations yet. Find a student in Explore to start one.</Text>} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }, callButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 }, list: { padding: spacing.lg, paddingBottom: 40 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, name: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 }, preview: { color: colors.muted, marginTop: 5, fontSize: 13 }, badge: { minWidth: 23, height: 23, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' }, empty: { color: colors.muted, textAlign: 'center', lineHeight: 22, padding: 50 } });
