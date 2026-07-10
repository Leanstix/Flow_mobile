import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, unwrapList } from '@/lib/api';
import { notificationKeys } from '@/lib/query-keys';
import { filterNotificationsForUser } from '@/lib/notification-isolation';
import { Avatar } from '@/components/avatar';
import { colors, spacing } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';
import { useAuthStore } from '@/state/auth-store';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const client = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id || s.session?.user.user_id);
  const query = useQuery({ queryKey: notificationKeys.list(userId), queryFn: fetchNotifications, enabled: Boolean(userId) });
  const scopedPayload = filterNotificationsForUser(query.data, userId);
  const items = unwrapList(scopedPayload);
  const allRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      client.setQueryData(notificationKeys.list(userId), (current: any) => Array.isArray(current) ? current.map((item) => ({ ...item, is_read: true })) : current ? { ...current, results: current.results.map((item: Notification) => ({ ...item, is_read: true })) } : current);
      client.setQueryData(notificationKeys.unread(userId), { unread_count: 0 });
      showSuccess('Notifications cleared', 'Everything for this account is marked as read.');
    },
    onError: (e) => showApiError(e, 'Could not update alerts'),
  });
  const open = async (item: Notification) => {
    if (Number(item.recipient) !== Number(userId)) return;
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        client.setQueryData(notificationKeys.list(userId), (current: any) => Array.isArray(current) ? current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry) : current ? { ...current, results: current.results.map((entry: Notification) => entry.id === item.id ? { ...entry, is_read: true } : entry) } : current);
        client.setQueryData(notificationKeys.unread(userId), (current: any) => ({ unread_count: Math.max(0, (current?.unread_count || 1) - 1) }));
      } catch (error) { showApiError(error, 'Could not update notification'); return; }
    }
    if (item.target_conversation_id) router.push({ pathname: '/conversation/[id]', params: { id: String(item.target_conversation_id) } });
    else if (item.target_post_id) router.push({ pathname: '/post/[id]', params: { id: String(item.target_post_id) } });
  };
  return <View style={styles.root}><View style={styles.header}><View><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>Private realtime activity for this account.</Text></View><Pressable disabled={!items.some((item) => !item.is_read) || allRead.isPending} onPress={() => allRead.mutate()} style={styles.readAll}><CheckCheck color={colors.primary} size={19} /><Text style={styles.readText}>Read all</Text></Pressable></View><FlatList contentContainerStyle={styles.list} data={items} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.primary} />} renderItem={({ item }) => <Pressable onPress={() => open(item)} style={[styles.item, !item.is_read && styles.unread]}><Avatar user={item.actor} size={46} /><View style={{ flex: 1 }}><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text></View>{!item.is_read ? <View style={styles.dot} /> : null}</Pressable>} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} ListEmptyComponent={<View style={styles.empty}><Bell color={colors.muted} size={34} /><Text style={styles.emptyTitle}>You are all caught up</Text><Text style={styles.subtitle}>Only notifications addressed to this account appear here.</Text></View>} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 5, lineHeight: 20 }, readAll: { flexDirection: 'row', gap: 6, alignItems: 'center' }, readText: { color: colors.primary, fontWeight: '800', fontSize: 13 }, list: { padding: spacing.lg, paddingBottom: 40 }, item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14 }, unread: { backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }, message: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' }, date: { color: colors.muted, fontSize: 11, marginTop: 5 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }, empty: { alignItems: 'center', paddingTop: 80, gap: 10 }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' } });
