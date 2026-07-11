import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Hash, MessageCircle, Search, UserPlus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { createConversation, searchHashtags, searchPosts, searchUsers, sendFriendRequest, unwrapList } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/ui';
import { PostCard } from '@/components/post-card';
import { colors, spacing } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';
import type { User } from '@/types';

type Mode = 'people' | 'posts' | 'hashtags';

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ q?: string; mode?: Mode }>();
  const query = typeof params.q === 'string' ? params.q : '';
  const inferredMode: Mode = query.startsWith('#') ? 'posts' : query.startsWith('@') ? 'people' : 'people';
  const mode: Mode = params.mode === 'posts' || params.mode === 'hashtags' || params.mode === 'people' ? params.mode : inferredMode;
  const setQuery = (value: string) => router.setParams({ q: value });
  const setMode = (value: Mode) => router.setParams({ mode: value });

  const trimmed = query.trim();
  const peopleTerm = trimmed.replace(/^@/, '');
  const hashtagTerm = trimmed.replace(/^#/, '');
  const enabled = trimmed.length >= 2;
  const people = useQuery({ queryKey: ['search', 'people', peopleTerm], queryFn: () => searchUsers(peopleTerm), enabled: peopleTerm.length >= 2 && mode === 'people' });
  const posts = useQuery({ queryKey: ['search', 'posts', trimmed], queryFn: () => searchPosts(trimmed), enabled: enabled && mode === 'posts' });
  const hashtags = useQuery({ queryKey: ['search', 'hashtags', hashtagTerm], queryFn: () => searchHashtags(hashtagTerm), enabled: mode === 'hashtags' });
  const request = useMutation({ mutationFn: sendFriendRequest, onSuccess: () => showSuccess('Request sent', 'They will see your Flow request.'), onError: (error) => showApiError(error, 'Could not send request') });
  const message = useMutation({ mutationFn: (id: number) => createConversation([id]), onSuccess: (conversation) => router.push({ pathname: '/conversation/[id]', params: { id: String(conversation.id), name: conversation.name } }), onError: (error) => showApiError(error, 'Could not start conversation') });
  const users = Array.isArray(people.data) ? people.data : [];
  const postItems = unwrapList(posts.data);
  const tagItems = Array.isArray(hashtags.data) ? hashtags.data : [];

  const renderPerson = ({ item }: { item: User }) => <Card style={styles.person}><Avatar user={item} size={50} /><View style={{ flex: 1 }}><Text style={styles.name}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.user_name || item.email}</Text><Text style={styles.meta}>@{item.user_name || 'student'} · {item.department || item.email}</Text></View><Pressable accessibilityLabel="Connect" onPress={() => request.mutate((item.id || item.user_id)!)} style={styles.iconButton}><UserPlus color={colors.primary} size={20} /></Pressable><Pressable accessibilityLabel="Message" onPress={() => message.mutate((item.id || item.user_id)!)} style={styles.iconButton}><MessageCircle color={colors.primary} size={20} /></Pressable></Card>;

  return <View style={styles.root}><View style={styles.top}><Text style={styles.title}>Explore Flow</Text><Text style={styles.subtitle}>Find @people, posts and #campus topics.</Text><View style={styles.search}><Search color={colors.muted} size={20} /><TextInput autoCapitalize="none" onChangeText={setQuery} placeholder="Search @username, #topic or posts" placeholderTextColor={colors.muted} style={styles.searchInput} value={query} /></View><View style={styles.tabs}>{(['people', 'posts', 'hashtags'] as Mode[]).map((item) => <Pressable key={item} onPress={() => setMode(item)} style={[styles.tab, mode === item && styles.activeTab]}><Text style={[styles.tabText, mode === item && styles.activeTabText]}>{item === 'people' ? 'People' : item === 'posts' ? 'Posts' : 'Hashtags'}</Text></Pressable>)}</View></View>{mode === 'people' ? <FlatList contentContainerStyle={styles.list} data={users} keyExtractor={(item) => String(item.id || item.user_id)} renderItem={renderPerson} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Text style={styles.empty}>{peopleTerm.length >= 2 ? 'No matching students.' : 'Enter at least two characters.'}</Text>} /> : mode === 'posts' ? <FlatList contentContainerStyle={styles.list} data={postItems} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <PostCard post={item} />} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Text style={styles.empty}>{enabled ? 'No matching posts.' : 'Enter at least two characters.'}</Text>} /> : <FlatList contentContainerStyle={styles.list} data={tagItems} keyExtractor={(item) => item.name} renderItem={({ item }) => <Pressable onPress={() => router.setParams({ q: `#${item.name}`, mode: 'posts' })}><Card style={styles.hashtagCard}><View style={styles.hashIcon}><Hash color={colors.primary} size={21} /></View><View><Text style={styles.hashTitle}>#{item.name}</Text><Text style={styles.meta}>{item.posts_count} posts</Text></View></Card></Pressable>} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListEmptyComponent={<Text style={styles.empty}>{hashtags.isLoading ? 'Loading hashtags…' : 'No matching hashtags.'}</Text>} />}</View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, top: { padding: spacing.lg, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.border }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, subtitle: { color: colors.muted }, search: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }, searchInput: { flex: 1, color: colors.text, fontSize: 15 }, tabs: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 14, padding: 4 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 }, activeTab: { backgroundColor: '#fff' }, tabText: { color: colors.muted, fontWeight: '700', fontSize: 12 }, activeTabText: { color: colors.primary }, list: { padding: spacing.lg, paddingBottom: 40 }, person: { flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { color: colors.text, fontWeight: '800' }, meta: { color: colors.muted, fontSize: 12, marginTop: 3 }, iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, empty: { color: colors.muted, textAlign: 'center', paddingTop: 60 }, hashtagCard: { flexDirection: 'row', alignItems: 'center', gap: 13 }, hashIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, hashTitle: { color: colors.text, fontWeight: '900', fontSize: 17 } });
