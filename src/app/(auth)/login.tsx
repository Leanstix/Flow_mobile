import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Button, Field } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/state/auth-store';
import { showApiError } from '@/state/ui-store';

const schema = z.object({ email: z.email('Enter a valid university email.'), password: z.string().min(1, 'Enter your password.') });
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const submit = async (values: FormData) => {
    try {
      await signIn(values.email.trim().toLowerCase(), values.password);
      const user = useAuthStore.getState().session?.user;
      router.replace(user?.user_name ? '/(tabs)/home' : '/onboarding');
    } catch (error) { showApiError(error, 'Could not sign in'); }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><View style={styles.logo}><Text style={styles.logoText}>F</Text></View><Text style={styles.wordmark}>Flow</Text><Text style={styles.tagline}>Your university community, in your pocket.</Text></View><View style={styles.form}><Text style={styles.title}>Welcome back</Text><Text style={styles.subtitle}>Sign in to continue campus conversations.</Text><Controller control={control} name="email" render={({ field: { value, onChange, onBlur } }) => <Field autoCapitalize="none" autoComplete="email" error={errors.email?.message} keyboardType="email-address" label="Email" onBlur={onBlur} onChangeText={onChange} value={value} />} /><Controller control={control} name="password" render={({ field: { value, onChange, onBlur } }) => <Field autoComplete="current-password" error={errors.password?.message} label="Password" onBlur={onBlur} onChangeText={onChange} secureTextEntry value={value} />} /><View style={{ alignItems: 'flex-end' }}><Link href="/(auth)/forgot-password" style={styles.forgot}>Forgot password?</Link></View><Button loading={isSubmitting} onPress={handleSubmit(submit)} title="Sign in" /><Text style={styles.helper}>New to Flow? <Link href="/(auth)/register" style={styles.link}>Create an account</Link></Text></View></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: 34 }, brand: { alignItems: 'center' }, logo: { width: 70, height: 70, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#fff', fontWeight: '900', fontSize: 34 }, wordmark: { marginTop: 14, fontSize: 34, fontWeight: '900', color: colors.navy }, tagline: { marginTop: 8, color: colors.muted, textAlign: 'center' }, form: { backgroundColor: '#fff', padding: 22, borderRadius: 28, borderWidth: 1, borderColor: colors.border, gap: 18 }, title: { color: colors.text, fontSize: 26, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 21, marginTop: -10 }, helper: { textAlign: 'center', color: colors.muted }, link: { color: colors.primary, fontWeight: '800' }, forgot: { color: colors.primary, fontWeight: '800', fontSize: 13 } });
