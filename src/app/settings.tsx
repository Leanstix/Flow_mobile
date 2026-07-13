import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';

import { Button, Card, Field, KeyboardAwareScrollView, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { passwordChange, updateUserProfile, uploadProfilePicture } from '@/lib/api';
import { useAuthStore } from '@/state/auth-store';
import { usePreferencesStore } from '@/state/preferences-store';
import { showApiError, showSuccess } from '@/state/ui-store';

const profileSchema = z.object({ first_name: z.string().max(50), last_name: z.string().max(50), user_name: z.string().min(2).max(50), department: z.string().max(255), year_of_study: z.string(), phone_number: z.string(), bio: z.string().max(250), profile_picture: z.union([z.url('Enter a valid URL.'), z.literal('')]) });
const passwordSchema = z.object({ current_password: z.string().min(1), new_password: z.string().min(8, 'Use at least 8 characters.'), confirm: z.string() }).refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.session?.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const signOut = useAuthStore((s) => s.signOut);
  const prefs = usePreferencesStore();
  const profile = useForm<ProfileData>({ resolver: zodResolver(profileSchema), defaultValues: { first_name: user?.first_name || '', last_name: user?.last_name || '', user_name: user?.user_name || '', department: user?.department || '', year_of_study: String(user?.year_of_study || ''), phone_number: user?.phone_number || '', bio: user?.bio || '', profile_picture: user?.profile_picture || '' } });
  const { reset: resetProfile } = profile;
  const password = useForm<PasswordData>({ resolver: zodResolver(passwordSchema), defaultValues: { current_password: '', new_password: '', confirm: '' } });
  useEffect(() => { resetProfile({ first_name: user?.first_name || '', last_name: user?.last_name || '', user_name: user?.user_name || '', department: user?.department || '', year_of_study: String(user?.year_of_study || ''), phone_number: user?.phone_number || '', bio: user?.bio || '', profile_picture: user?.profile_picture || '' }); }, [user, resetProfile]);
  const saveProfile = async (values: ProfileData) => { try { const updated = await updateUserProfile(values); await updateUser(updated); showSuccess('Profile updated', 'Your latest details are now visible across Flow.'); } catch (error) { showApiError(error, 'Could not update profile'); } };
  const savePassword = async ({ current_password, new_password }: PasswordData) => { try { await passwordChange(current_password, new_password); password.reset(); showSuccess('Password changed', 'Your account password has been updated.'); } catch (error) { showApiError(error, 'Could not change password'); } };
  const pickProfileImage = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { showApiError(new Error('Photo library permission is required.'), 'Permission needed'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82 }); if (result.canceled) return; const asset = result.assets[0]; try { const updated = await uploadProfilePicture(asset.uri, asset.fileName || 'flow-profile.jpg', asset.mimeType || 'image/jpeg'); await updateUser(updated); showSuccess('Photo updated', 'Your new profile photo is now cached and visible across Flow.'); } catch (error) { showApiError(error, 'Could not upload profile photo'); } };
  const logout = async () => { try { await signOut(); router.replace('/(auth)/login'); } catch (error) { showApiError(error, 'Could not sign out'); } };
  const labels: Record<keyof ProfileData, string> = { first_name: 'First name', last_name: 'Last name', user_name: 'Username', department: 'Department', year_of_study: 'Year of study', phone_number: 'Phone number', bio: 'Bio', profile_picture: 'Profile image URL' };
  return <Screen><KeyboardAwareScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Account settings</Text><Text style={styles.subtitle}>Manage identity, security and native app preferences.</Text><Card style={styles.section}><Text style={styles.sectionTitle}>Profile</Text><Button onPress={pickProfileImage} title="Choose profile photo" variant="secondary" />{(Object.keys(labels) as (keyof ProfileData)[]).map((name) => <Controller key={name} control={profile.control} name={name} render={({ field }) => <Field error={profile.formState.errors[name]?.message} label={labels[name]} multiline={name === 'bio'} onBlur={field.onBlur} onChangeText={field.onChange} value={field.value || ''} />} />)}<Button loading={profile.formState.isSubmitting} onPress={profile.handleSubmit(saveProfile)} title="Save profile" /></Card><Card style={styles.section}><Text style={styles.sectionTitle}>App preferences</Text><PreferenceRow label="Realtime notifications" description="Keep the notification socket active while signed in." value={prefs.realtimeNotifications} onChange={(value) => prefs.update('realtimeNotifications', value)} /><PreferenceRow label="Message previews" description="Show the latest message in the conversation list." value={prefs.messagePreviews} onChange={(value) => prefs.update('messagePreviews', value)} /><PreferenceRow label="Reduce motion" description="Reduce non-essential interface animation." value={prefs.reduceMotion} onChange={(value) => prefs.update('reduceMotion', value)} /></Card><Card style={styles.section}><Text style={styles.sectionTitle}>Change password</Text><Controller control={password.control} name="current_password" render={({ field }) => <Field secureTextEntry error={password.formState.errors.current_password?.message} label="Current password" onChangeText={field.onChange} value={field.value} />} /><Controller control={password.control} name="new_password" render={({ field }) => <Field secureTextEntry error={password.formState.errors.new_password?.message} label="New password" onChangeText={field.onChange} value={field.value} />} /><Controller control={password.control} name="confirm" render={({ field }) => <Field secureTextEntry error={password.formState.errors.confirm?.message} label="Confirm password" onChangeText={field.onChange} value={field.value} />} /><Button loading={password.formState.isSubmitting} onPress={password.handleSubmit(savePassword)} title="Update password" /></Card><Button onPress={logout} title="Sign out" variant="danger" /></KeyboardAwareScrollView></Screen>;
}

function PreferenceRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <Pressable onPress={() => onChange(!value)} style={styles.preference}><View style={{ flex: 1 }}><Text style={styles.preferenceLabel}>{label}</Text><Text style={styles.preferenceDescription}>{description}</Text></View><Switch onValueChange={onChange} trackColor={{ true: '#9FB1F6' }} thumbColor={value ? colors.primary : '#fff'} value={value} /></Pressable>; }

const styles = StyleSheet.create({ content: { padding: spacing.lg, gap: 16, paddingBottom: 50 }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 21, marginTop: -8 }, section: { gap: 15 }, sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, preference: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 5 }, preferenceLabel: { color: colors.text, fontWeight: '800' }, preferenceDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 } });
