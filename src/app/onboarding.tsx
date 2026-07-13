import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';

import { Button, Field, KeyboardAwareScrollView, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { updateUserProfile } from '@/lib/api';
import { useAuthStore } from '@/state/auth-store';
import { showApiError, showSuccess } from '@/state/ui-store';

const schema = z.object({ first_name: z.string().min(1, 'Required.'), last_name: z.string().min(1, 'Required.'), user_name: z.string().min(2, 'Use at least 2 characters.'), department: z.string().min(2, 'Enter your department.'), year_of_study: z.string().min(1, 'Enter your year.'), bio: z.string().max(250).optional() });
type FormData = z.infer<typeof schema>;

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { first_name: user?.first_name || '', last_name: user?.last_name || '', user_name: user?.user_name || '', department: user?.department || '', year_of_study: String(user?.year_of_study || ''), bio: user?.bio || '' } });
  const submit = async (values: FormData) => { try { const updated = await updateUserProfile(values); await updateUser(updated); showSuccess('Profile ready', 'Welcome to your campus network.'); router.replace('/(tabs)/home'); } catch (error) { showApiError(error, 'Could not save your profile'); } };
  return <Screen><KeyboardAwareScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>ONE LAST STEP</Text><Text style={styles.title}>Build your campus identity</Text><Text style={styles.subtitle}>This information helps classmates find the right person.</Text>{(['first_name','last_name','user_name','department','year_of_study','bio'] as const).map((name) => <Controller key={name} control={control} name={name} render={({ field }) => <Field error={errors[name]?.message} label={{first_name:'First name',last_name:'Last name',user_name:'Username',department:'Department',year_of_study:'Year of study',bio:'Short bio'}[name]} multiline={name === 'bio'} onBlur={field.onBlur} onChangeText={field.onChange} value={field.value || ''} />} />)}<Button loading={isSubmitting} onPress={handleSubmit(submit)} title="Enter Flow" /></KeyboardAwareScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.xl, paddingBottom: 48, gap: 18, flexGrow: 1 }, kicker: { marginTop: 20, color: colors.primary, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 8 } });
