import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Field } from '@/components/ui';
import { activateAccount } from '@/lib/api';
import { colors, spacing } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';

export default function ActivateScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token || '');
  const [loading, setLoading] = useState(false);
  const activate = async () => {
    if (!token.trim()) return;
    setLoading(true);
    try { await activateAccount(token.trim()); showSuccess('Account activated', 'You can now sign in to Flow.'); router.replace('/(auth)/login'); }
    catch (error) { showApiError(error, 'Could not activate account'); }
    finally { setLoading(false); }
  };
  return <View style={styles.root}><Text style={styles.kicker}>VERIFY YOUR ACCOUNT</Text><Text style={styles.title}>Activate Flow</Text><Text style={styles.subtitle}>Activation links open this screen automatically. You can also paste the token below.</Text><Field autoCapitalize="none" label="Activation token" onChangeText={setToken} value={token} /><Button loading={loading} onPress={activate} title="Activate account" /><Button onPress={() => router.replace('/(auth)/login')} title="Back to sign in" variant="secondary" /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, paddingTop: 100, gap: 18 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 8 } });
