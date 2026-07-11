import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme';

const pattern = /([#@][A-Za-z0-9_.]+)/g;

export function RichText({ value, style }: { value: string; style?: StyleProp<TextStyle> }) {
  return <Text style={style}>{String(value || '').split(pattern).map((part, index) => part.startsWith('#') || part.startsWith('@') ? <Text key={`${part}-${index}`} onPress={() => router.push({ pathname: '/explore', params: { q: part } })} style={{ color: part.startsWith('#') ? colors.primary : '#7C3AED', fontWeight: '800' }}>{part}</Text> : <Text key={`${index}-${part.slice(0, 6)}`}>{part}</Text>)}</Text>;
}
