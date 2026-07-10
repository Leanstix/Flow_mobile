import React from 'react';
import { Tabs } from 'expo-router';
import { Bell, Compass, Home, MessageCircle, UserRound } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { fetchConversations, fetchUnreadNotificationCount } from '@/lib/api';

export default function TabsLayout() {
  const { hydrated, session } = useAuthGuard();
  const unread = useQuery({ queryKey: ['notifications', 'unread'], queryFn: fetchUnreadNotificationCount, enabled: Boolean(session), refetchInterval: 30_000 });
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations, enabled: Boolean(session), refetchInterval: 30_000 });
  if (!hydrated || !session) return null;
  const notificationBadge = unread.data?.unread_count ? unread.data.unread_count : undefined;
  const messageBadge = Array.isArray(conversations.data) ? conversations.data.reduce((total, item) => total + (item.unread_count || 0), 0) || undefined : undefined;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerShadowVisible: false, headerTitleStyle: { fontWeight: '900' }, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border }, tabBarLabelStyle: { fontWeight: '700', fontSize: 11 }, tabBarBadgeStyle: { backgroundColor: colors.primary, color: '#fff', fontSize: 10 } }}><Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }} /><Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Compass color={color} size={22} /> }} /><Tabs.Screen name="messages" options={{ title: 'Messages', tabBarBadge: messageBadge, tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} /> }} /><Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarBadge: notificationBadge, tabBarIcon: ({ color }) => <Bell color={color} size={22} /> }} /><Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <UserRound color={color} size={22} /> }} /></Tabs>;
}
