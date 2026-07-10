import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Bell, Compass, Home, MessageCircle, ShoppingBag, UserRound, UsersRound } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { fetchConversations, fetchUnreadNotificationCount } from '@/lib/api';
import { notificationKeys } from '@/lib/query-keys';

export default function TabsLayout() {
  const { hydrated, session } = useAuthGuard();
  const userId = session?.user.id || session?.user.user_id;
  const unread = useQuery({ queryKey: notificationKeys.unread(userId), queryFn: fetchUnreadNotificationCount, enabled: Boolean(session && userId), refetchInterval: 30_000 });
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations, enabled: Boolean(session), refetchInterval: 30_000 });
  if (!hydrated || !session) return null;
  const notificationBadge = unread.data?.unread_count || 0;
  const messageBadge = Array.isArray(conversations.data) ? conversations.data.reduce((total, item) => total + (item.unread_count || 0), 0) || undefined : undefined;
  const headerRight = () => <View style={styles.headerActions}><Pressable accessibilityLabel="Open notifications" onPress={() => router.push('/notifications')} style={styles.headerButton}><Bell color={colors.text} size={20} />{notificationBadge > 0 ? <View style={styles.notificationDot} /> : null}</Pressable><Pressable accessibilityLabel="Open profile" onPress={() => router.push('/profile')} style={styles.headerButton}><UserRound color={colors.text} size={20} /></Pressable></View>;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerShadowVisible: false, headerTitleStyle: { fontWeight: '900' }, headerRight, headerRightContainerStyle: { paddingRight: 14 }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border }, tabBarLabelStyle: { fontWeight: '700', fontSize: 11 }, tabBarBadgeStyle: { backgroundColor: colors.primary, color: '#fff', fontSize: 10 } }}><Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} /><Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Compass color={color} size={22} /> }} /><Tabs.Screen name="groups" options={{ title: 'Groups', tabBarIcon: ({ color }) => <UsersRound color={color} size={22} /> }} /><Tabs.Screen name="marketplace" options={{ title: 'Market', tabBarIcon: ({ color }) => <ShoppingBag color={color} size={22} /> }} /><Tabs.Screen name="messages" options={{ title: 'Messages', tabBarBadge: messageBadge, tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} /> }} /><Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} /><Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} /></Tabs>;
}

const styles = StyleSheet.create({ headerActions: { flexDirection: 'row', gap: 8 }, headerButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, notificationDot: { position: 'absolute', right: 7, top: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: '#fff' } });
