import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CachedImage } from './media';
import type { User } from '@/types';
import { colors } from '@/theme';

export function Avatar({ user, size = 44 }: { user?: User | null; size?: number }) {
  const name = user?.user_name || user?.first_name || user?.email || 'F';
  if (user?.profile_picture) return <CachedImage source={user.profile_picture} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.initial, { fontSize: size * .38 }]}>{name[0]?.toUpperCase()}</Text></View>;
}
const styles = StyleSheet.create({ fallback: { backgroundColor: '#E7ECFF', alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.primary, fontWeight: '900' } });
