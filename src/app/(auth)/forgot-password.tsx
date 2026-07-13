import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { Button, Field, KeyboardAwareScrollView, Screen } from '@/components/ui';
import { requestPasswordReset, resetPassword } from '@/lib/api';
import { colors, spacing } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ uid?: string; token?: string }>();
  const completing = Boolean(params.uid && params.token);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      if (completing) {
        if (password.length < 8) throw new Error('Use at least 8 characters.');
        if (password !== confirm) throw new Error('Passwords do not match.');
        await resetPassword(params.uid!, params.token!, password);
        showSuccess('Password reset', 'You can now sign in with your new password.');
        router.replace('/(auth)/login');
      } else {
        await requestPasswordReset(email.trim().toLowerCase());
        showSuccess('Reset requested', 'Check your email for the secure reset link.');
      }
    } catch (error) { showApiError(error, completing ? 'Could not reset password' : 'Could not request reset'); }
    finally { setLoading(false); }
  };
  return <Screen><KeyboardAwareScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>ACCOUNT RECOVERY</Text><Text style={styles.title}>{completing ? 'Choose a new password' : 'Reset your password'}</Text><Text style={styles.subtitle}>{completing ? 'Use a strong password you do not reuse elsewhere.' : 'Enter your Flow email and we will request a reset link from the backend.'}</Text>{completing ? <><Field label="New password" onChangeText={setPassword} secureTextEntry value={password} /><Field label="Confirm password" onChangeText={setConfirm} secureTextEntry value={confirm} /></> : <Field autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />}<Button disabled={completing ? !password || !confirm : !email.trim()} loading={loading} onPress={submit} title={completing ? 'Reset password' : 'Send reset link'} /><Button onPress={() => router.replace('/(auth)/login')} title="Back to sign in" variant="secondary" /></KeyboardAwareScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingBottom: 48, gap: 18 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 8 } });
