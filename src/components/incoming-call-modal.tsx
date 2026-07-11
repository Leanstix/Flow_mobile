import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { acceptCall, rejectCall } from '@/lib/api';
import { useCallStore } from '@/state/call-store';
import { showApiError } from '@/state/ui-store';
import { colors } from '@/theme';
import { Avatar } from './avatar';

export function IncomingCallModal() {
  const call = useCallStore((state) => state.incomingCall);
  const clearIncomingCall = useCallStore((state) => state.clearIncomingCall);
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  if (!call) return null;

  const caller = call.created_by || call.invitations[0]?.invited_by || undefined;
  const callerName = caller?.user_name || caller?.email || 'Flow user';

  const accept = async () => {
    setBusy('accept');
    try {
      const accepted = await acceptCall(call.room_name);
      clearIncomingCall(call.room_name);
      router.push({
        pathname: '/calls/[room]',
        params: {
          room: accepted.room_name,
          callType: accepted.call_type,
          name: callerName,
          incoming: '1',
        },
      });
    } catch (error) {
      showApiError(error, 'Could not answer call');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await rejectCall(call.room_name);
      clearIncomingCall(call.room_name);
    } catch (error) {
      showApiError(error, 'Could not decline call');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={reject} presentationStyle="fullScreen" visible>
      <SafeAreaView style={styles.root}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />
        <View style={styles.content}>
          <Text style={styles.brand}>FLOW</Text>
          <Text style={styles.kind}>{call.call_type === 'video' ? 'Incoming video call' : 'Incoming audio call'}</Text>
          <View style={styles.avatarRing}><Avatar user={caller} size={118} /></View>
          <Text numberOfLines={1} style={styles.name}>{callerName}</Text>
          <Text style={styles.status}>Calling you…</Text>
        </View>
        <View style={styles.actions}>
          <View style={styles.actionBlock}>
            <Pressable accessibilityLabel="Decline call" disabled={Boolean(busy)} onPress={reject} style={[styles.circle, styles.decline]}>
              <PhoneOff color="#fff" size={31} />
            </Pressable>
            <Text style={styles.actionLabel}>{busy === 'reject' ? 'Declining…' : 'Decline'}</Text>
          </View>
          <View style={styles.actionBlock}>
            <Pressable accessibilityLabel="Answer call" disabled={Boolean(busy)} onPress={accept} style={[styles.circle, styles.accept]}>
              {call.call_type === 'video' ? <Video color="#fff" size={31} /> : <Phone color="#fff" size={31} />}
            </Pressable>
            <Text style={styles.actionLabel}>{busy === 'accept' ? 'Connecting…' : 'Accept'}</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07111F', overflow: 'hidden' },
  glowOne: { position: 'absolute', width: 330, height: 330, borderRadius: 180, backgroundColor: 'rgba(48,87,213,0.24)', top: -70, right: -80 },
  glowTwo: { position: 'absolute', width: 290, height: 290, borderRadius: 170, backgroundColor: 'rgba(122,90,248,0.17)', bottom: 30, left: -120 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  brand: { color: '#A5B4FC', fontSize: 12, fontWeight: '900', letterSpacing: 4, marginBottom: 24 },
  kind: { color: '#CBD5E1', fontSize: 16, fontWeight: '700', marginBottom: 34 },
  avatarRing: { padding: 8, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' },
  name: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 25, maxWidth: '92%' },
  status: { color: '#94A3B8', fontSize: 15, marginTop: 8 },
  actions: { minHeight: 180, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 42, paddingBottom: 28 },
  actionBlock: { alignItems: 'center', gap: 10 },
  circle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.success },
  actionLabel: { color: '#E2E8F0', fontSize: 13, fontWeight: '800' },
});
