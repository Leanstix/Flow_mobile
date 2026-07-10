import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarDays, Phone, Settings, UsersRound } from 'lucide-react-native';
import { getPosts, getUserProfile } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { PostCard } from '@/components/post-card';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/state/auth-store';

export default function ProfileScreen() {
  const stored = useAuthStore((s) => s.session?.user);
  const id = stored?.user_id || stored?.id;
  const profileQuery = useQuery({ queryKey: ['profile', id], queryFn: () => getUserProfile(id!), enabled: Boolean(id) });
  const postsQuery = useQuery({ queryKey: ['posts', 'mine'], queryFn: getPosts });
  const profile = { ...stored, ...profileQuery.data };
  const posts = Array.isArray(postsQuery.data) ? postsQuery.data : [];
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.user_name || 'Flow student';
  return <FlatList contentContainerStyle={styles.list} data={posts} keyExtractor={(item) => String(item.id)} ListHeaderComponent={<View><View style={styles.cover}><Pressable onPress={() => router.push('/settings')} style={styles.settings}><Settings color="#fff" size={21} /></Pressable></View><View style={styles.profile}><View style={styles.avatarWrap}><Avatar user={profile as import("@/types").User} size={96} /></View><Text style={styles.name}>{fullName}</Text><Text style={styles.handle}>@{profile.user_name || 'flow-student'}</Text><Text style={styles.bio}>{profile.bio || 'Add a bio from Settings so classmates know what you are building and learning.'}</Text><View style={styles.chips}>{profile.department ? <Text style={styles.chip}>{profile.department}</Text> : null}{profile.year_of_study ? <Text style={styles.chip}>Year {profile.year_of_study}</Text> : null}</View><View style={styles.shortcuts}><Pressable onPress={() => router.push('/connections')} style={styles.shortcut}><UsersRound color={colors.primary} size={20} /><Text style={styles.shortcutText}>Connections</Text></Pressable><Pressable onPress={() => router.push('/calls')} style={styles.shortcut}><Phone color={colors.primary} size={20} /><Text style={styles.shortcutText}>Calls</Text></Pressable><Pressable onPress={() => router.push('/community')} style={styles.shortcut}><CalendarDays color={colors.primary} size={20} /><Text style={styles.shortcutText}>Community</Text></Pressable></View><Text style={styles.section}>Your posts</Text></View></View>} renderItem={({ item }) => <PostCard post={item} />} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} ListEmptyComponent={<Text style={styles.empty}>You have not published anything yet.</Text>} />;
}
const styles = StyleSheet.create({ list: { paddingBottom: 40, backgroundColor: colors.background }, cover: { height: 170, backgroundColor: colors.navy, position: 'relative' }, settings: { position: 'absolute', right: 18, top: 18, width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' }, profile: { paddingHorizontal: spacing.lg, marginBottom: 14 }, avatarWrap: { marginTop: -48, alignSelf: 'flex-start', borderWidth: 4, borderColor: '#fff', borderRadius: 55 }, name: { marginTop: 13, color: colors.text, fontSize: 28, fontWeight: '900' }, handle: { color: colors.primary, fontWeight: '800', marginTop: 3 }, bio: { color: colors.muted, marginTop: 14, lineHeight: 22 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, chip: { color: colors.primary, backgroundColor: '#E8EEFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, fontWeight: '700', fontSize: 12 }, shortcuts: { flexDirection: 'row', gap: 8, marginTop: 20 }, shortcut: { flex: 1, minHeight: 72, borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 }, shortcutText: { color: colors.text, fontSize: 11, fontWeight: '800' }, section: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 26, marginBottom: 13 }, empty: { color: colors.muted, textAlign: 'center', padding: 40 } });
