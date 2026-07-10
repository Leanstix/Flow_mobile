import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MessageCircle, UsersRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { acceptFriendRequest, createConversation, getFriendRequests, getFriends } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Button, Card } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';
import type { Friend, FriendRequest } from '@/types';

export default function ConnectionsScreen() {
  const client = useQueryClient();
  const pending = useQuery({ queryKey: ['friend-requests'], queryFn: getFriendRequests });
  const friends = useQuery({ queryKey: ['friends'], queryFn: getFriends });
  const accept = useMutation({ mutationFn: acceptFriendRequest, onSuccess: () => { client.invalidateQueries({ queryKey: ['friend-requests'] }); client.invalidateQueries({ queryKey: ['friends'] }); showSuccess('Request accepted', 'You are now connected on Flow.'); }, onError: (e) => showApiError(e, 'Could not accept request') });
  const openConversation = async (friend: Friend) => {
    try {
      const conversation = friend.conversation_id ? { id: friend.conversation_id, name: friend.user_name || friend.email } : await createConversation([(friend.id || friend.user_id)!]);
      router.push({ pathname: '/conversation/[id]', params: { id: String(conversation.id), name: conversation.name || friend.user_name || friend.email } });
    } catch (error) { showApiError(error, 'Could not open conversation'); }
  };
  const refreshing = pending.isRefetching || friends.isRefetching;
  const refresh = () => { void pending.refetch(); void friends.refetch(); };
  const requests = Array.isArray(pending.data) ? pending.data : [];
  const accepted = Array.isArray(friends.data) ? friends.data : [];
  return <FlatList contentContainerStyle={styles.list} data={accepted} keyExtractor={(item) => String(item.id || item.user_id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} ListHeaderComponent={<View style={styles.header}><Text style={styles.kicker}>YOUR NETWORK</Text><Text style={styles.title}>Connections</Text><Text style={styles.subtitle}>Accept Flow requests and continue conversations with classmates.</Text>{requests.length > 0 ? <View style={styles.requests}><Text style={styles.sectionTitle}>Pending requests</Text>{requests.map((request: FriendRequest) => <Card key={request.id} style={styles.requestCard}><Avatar user={request.from_user} size={48} /><View style={{ flex: 1 }}><Text style={styles.name}>{[request.from_user.first_name, request.from_user.last_name].filter(Boolean).join(' ') || request.from_user.user_name || request.from_user.email}</Text><Text style={styles.meta}>Wants to connect on Flow</Text></View><Pressable accessibilityRole="button" onPress={() => accept.mutate(request.id)} style={styles.accept}><Check color="#fff" size={19} /></Pressable></Card>)}</View> : null}<Text style={styles.sectionTitle}>Friends</Text></View>} renderItem={({ item }) => <Card style={styles.friendCard}><Avatar user={item} size={50} /><View style={{ flex: 1 }}><Text style={styles.name}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.user_name || item.email}</Text><Text style={styles.meta}>@{item.user_name || 'student'}</Text></View><Pressable onPress={() => openConversation(item)} style={styles.message}><MessageCircle color={colors.primary} size={20} /></Pressable></Card>} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Card style={styles.empty}><UsersRound color={colors.muted} size={34} /><Text style={styles.emptyTitle}>No connections yet</Text><Text style={styles.subtitle}>Find classmates from Explore and send a Flow request.</Text><Button onPress={() => router.push('/(tabs)/explore')} title="Explore students" /></Card>} />;
}
const styles = StyleSheet.create({ list: { padding: spacing.lg, paddingBottom: 40, backgroundColor: colors.background, flexGrow: 1 }, header: { gap: 6, marginBottom: 14 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.4, fontSize: 12 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 21 }, requests: { gap: 10, marginTop: 18, marginBottom: 18 }, sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 18, marginTop: 12 }, requestCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, friendCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: colors.text, fontWeight: '800' }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 }, accept: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, message: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, empty: { alignItems: 'center', gap: 10, marginTop: 35 }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' } });
