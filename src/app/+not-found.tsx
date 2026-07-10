import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotFoundScreen() {
  return <View style={styles.root}><Text style={styles.code}>404</Text><Text style={styles.title}>This Flow route does not exist</Text><Text style={styles.message}>The link may be old, incomplete, or unavailable in this app version.</Text><Button onPress={() => router.replace('/')} title="Return home" /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.xl, gap: 15 }, code: { color: colors.primary, fontWeight: '900', fontSize: 64 }, title: { color: colors.text, fontWeight: '900', fontSize: 27 }, message: { color: colors.muted, lineHeight: 22, marginBottom: 10 } });
