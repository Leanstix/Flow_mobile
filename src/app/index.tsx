import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';

export default function Index() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  if (!hydrated) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href={session.user.user_name ? '/(tabs)/home' : '/onboarding'} />;
}
