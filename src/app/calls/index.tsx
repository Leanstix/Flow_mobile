import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Video } from 'lucide-react-native';
import { Button, Card, Field } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { createRoom, joinRoom } from '@/lib/api';
import { showApiError } from '@/state/ui-store';

export default function CallsScreen() {
  const [room, setRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const create = async () => { setLoading(true); try { const data = await createRoom(); router.push({ pathname: '/calls/[room]', params: { room: data.room_name, host: '1' } }); } catch (error) { showApiError(error, 'Could not create call'); } finally { setLoading(false); } };
  const join = async () => { const value = room.trim(); if (!value) return; setLoading(true); try { await joinRoom(value); router.push({ pathname: '/calls/[room]', params: { room: value } }); } catch (error) { showApiError(error, 'Could not join call'); } finally { setLoading(false); } };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}><View style={styles.content}><View style={styles.hero}><View style={styles.icon}><Video color="#fff" size={30} /></View><Text style={styles.title}>Flow calls</Text><Text style={styles.subtitle}>Start a secure audio or video room with another student. Calls require a development build, not Expo Go.</Text></View><Card style={styles.card}><Text style={styles.cardTitle}>Start a new room</Text><Text style={styles.help}>Create a room, then share its code with the other participant.</Text><Button loading={loading} onPress={create} title="Create call room" /></Card><Card style={styles.card}><Text style={styles.cardTitle}>Join with a room code</Text><Field autoCapitalize="none" label="Room code" onChangeText={setRoom} value={room} /><Button disabled={!room.trim()} loading={loading} onPress={join} title="Join room" /></Card></View></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.xl, gap: 18 }, hero: { alignItems: 'center', marginBottom: 10 }, icon: { width: 68, height: 68, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 16 }, subtitle: { color: colors.muted, textAlign: 'center', lineHeight: 22, marginTop: 8 }, card: { gap: 14 }, cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' }, help: { color: colors.muted, lineHeight: 20 } });
