import React, { useMemo } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { router } from 'expo-router';

import { colors } from '@/theme';
import type { User } from '@/types';

const pattern = /([#@][A-Za-z0-9_.]+)/g;

export function RichText({ value, mentions = [], style }: { value: string; mentions?: User[]; style?: StyleProp<TextStyle> }) {
  const validMentions = useMemo(() => new Set(
    mentions
      .map((user) => user.user_name)
      .filter(Boolean)
      .map((username) => String(username).toLowerCase()),
  ), [mentions]);

  return <Text style={style}>{String(value || '').split(pattern).map((part, index) => {
    if (part.startsWith('#')) {
      return <Text key={`${part}-${index}`} onPress={() => router.push({ pathname: '/explore', params: { q: part } })} style={{ color: colors.primary, fontWeight: '800' }}>{part}</Text>;
    }
    if (part.startsWith('@') && validMentions.has(part.slice(1).toLowerCase())) {
      return <Text key={`${part}-${index}`} onPress={() => router.push({ pathname: '/explore', params: { q: part } })} style={{ color: '#7C3AED', fontWeight: '800' }}>{part}</Text>;
    }
    return <Text key={`${index}-${part.slice(0, 6)}`}>{part}</Text>;
  })}</Text>;
}
