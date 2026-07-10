import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { Button, Field } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { signUp } from '@/lib/api';
import { showApiError, showSuccess } from '@/state/ui-store';

const schema = z.object({ email: z.email('Enter a valid email.'), university_id: z.string().min(3, 'Enter your university ID.'), password: z.string().min(8, 'Use at least 8 characters.'), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', university_id: '', password: '', confirm: '' } });
  const submit = async ({ confirm: _, ...values }: FormData) => {
    try { await signUp({ ...values, email: values.email.trim().toLowerCase() }); showSuccess('Account created', 'Use the activation link provided by the backend, then sign in.'); router.replace('/(auth)/login'); }
    catch (error) { showApiError(error, 'Could not create account'); }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>JOIN FLOW</Text><Text style={styles.title}>Create your student account</Text><Text style={styles.subtitle}>Use the same university identity your classmates know.</Text><Controller control={control} name="email" render={({ field }) => <Field autoCapitalize="none" keyboardType="email-address" error={errors.email?.message} label="Email" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} /><Controller control={control} name="university_id" render={({ field }) => <Field autoCapitalize="characters" error={errors.university_id?.message} label="University ID" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} /><Controller control={control} name="password" render={({ field }) => <Field secureTextEntry error={errors.password?.message} label="Password" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} /><Controller control={control} name="confirm" render={({ field }) => <Field secureTextEntry error={errors.confirm?.message} label="Confirm password" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} />} /><Button loading={isSubmitting} onPress={handleSubmit(submit)} title="Create account" /><Button onPress={() => router.back()} title="Back to sign in" variant="secondary" /></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: spacing.xl, paddingTop: 70, gap: 18 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.8 }, title: { color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 10 } });
