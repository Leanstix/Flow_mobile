import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, RefreshCw, Signal, UserPlus, X } from 'lucide-react-native';
import { mediaDevices, MediaStream, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView } from 'react-native-webrtc';

import { fetchCall, getFriends, inviteCallParticipants, leaveCall } from '@/lib/api';
import { applyCallQuality, LOW_BANDWIDTH_VIDEO_CONSTRAINTS, networkSample, optimizeSdp, qualityFromMetrics, type CallQuality } from '@/lib/call-quality';
import { buildWebSocketUrl } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';
import { showApiError, showSuccess } from '@/state/ui-store';
import { Avatar } from '@/components/avatar';
import type { CallSession, Friend, User } from '@/types';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(process.env.EXPO_PUBLIC_TURN_URL ? [{ urls: process.env.EXPO_PUBLIC_TURN_URL, username: process.env.EXPO_PUBLIC_TURN_USERNAME, credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL }] : []),
];

function idOf(user?: User | null) {
  return Number(user?.id || user?.user_id || 0);
}

function displayName(user?: User | null) {
  return user?.user_name || user?.email || 'Flow user';
}

function optimizedDescription(description: any) {
  return new RTCSessionDescription({ type: description.type, sdp: optimizeSdp(description.sdp || '') });
}

export default function CallRoomScreen() {
  const { room, callType: routeCallType, name } = useLocalSearchParams<{ room: string; callType?: 'audio' | 'video'; name?: string }>();
  const access = useAuthStore((state) => state.session?.access);
  const currentUser = useAuthStore((state) => state.session?.user);
  const currentId = idOf(currentUser);
  const socket = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peers = useRef<Map<number, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<number, RTCIceCandidate[]>>(new Map());
  const offeredPeers = useRef<Set<number>>(new Set());
  const statsSnapshots = useRef<Map<number, { sent: number; lost: number }>>(new Map());
  const mountedRef = useRef(true);
  const callRef = useRef<CallSession | null>(null);
  const qualityRef = useRef<CallQuality>('poor');

  const [call, setCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(routeCallType !== 'audio');
  const [status, setStatus] = useState('Preparing low-data call…');
  const [quality, setQuality] = useState<CallQuality>('poor');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState<number[]>([]);
  const [inviting, setInviting] = useState(false);

  const friendsQuery = useQuery({ queryKey: ['friends'], queryFn: getFriends, enabled: inviteOpen });
  const friends = Array.isArray(friendsQuery.data) ? friendsQuery.data : [];
  const callType = call?.call_type || routeCallType || 'video';
  const videoCall = callType === 'video';

  const setCurrentCall = useCallback((next: CallSession) => {
    callRef.current = next;
    setCall(next);
    if (next.status === 'ringing') setStatus('Ringing…');
    if (next.status === 'active') setStatus('Connected');
    if (next.status === 'ended' || next.status === 'rejected') {
      setStatus(next.status === 'rejected' ? 'Call declined' : 'Call ended');
      setTimeout(() => router.back(), 700);
    }
  }, []);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(payload));
  }, []);

  const removePeer = useCallback((remoteId: number) => {
    peers.current.get(remoteId)?.close();
    peers.current.delete(remoteId);
    pendingCandidates.current.delete(remoteId);
    offeredPeers.current.delete(remoteId);
    statsSnapshots.current.delete(remoteId);
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[remoteId];
      return next;
    });
  }, []);

  const createPeer = useCallback((remoteId: number) => {
    const existing = peers.current.get(remoteId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 4,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    } as any);
    peers.current.set(remoteId, connection);
    localStreamRef.current?.getTracks().forEach((track) => connection.addTrack(track, localStreamRef.current as MediaStream));
    (connection as any).onicecandidate = (event: any) => {
      if (event.candidate) sendSignal({ type: 'ice-candidate', target_id: remoteId, candidate: event.candidate.toJSON() });
    };
    (connection as any).ontrack = (event: any) => {
      const stream = event.streams?.[0];
      if (stream) setRemoteStreams((current) => ({ ...current, [remoteId]: stream }));
    };
    (connection as any).onconnectionstatechange = () => {
      const peerState = (connection as any).connectionState;
      if (peerState === 'failed' || peerState === 'closed') removePeer(remoteId);
      if (peerState === 'disconnected') setStatus('Weak network — buffering media…');
      if (peerState === 'connected') setStatus(qualityRef.current === 'good' ? 'Connected' : `${qualityRef.current} network · audio protected`);
    };
    void applyCallQuality(connection as any, qualityRef.current);
    return connection;
  }, [removePeer, sendSignal]);

  const flushCandidates = useCallback(async (remoteId: number, connection: RTCPeerConnection) => {
    const queued = pendingCandidates.current.get(remoteId) || [];
    pendingCandidates.current.delete(remoteId);
    for (const candidate of queued) await connection.addIceCandidate(candidate);
  }, []);

  const createOffer = useCallback(async (remoteId: number) => {
    if (!remoteId || remoteId === currentId || offeredPeers.current.has(remoteId)) return;
    const connection = createPeer(remoteId);
    if (connection.signalingState !== 'stable') return;
    offeredPeers.current.add(remoteId);
    const offer = await connection.createOffer();
    const optimized = optimizedDescription(offer);
    await connection.setLocalDescription(optimized);
    sendSignal({ type: 'offer', target_id: remoteId, sdp: optimized });
  }, [createPeer, currentId, sendSignal]);

  useEffect(() => {
    if (!room || !access || !currentId) return;
    mountedRef.current = true;

    const setup = async () => {
      try {
        const session = await fetchCall(room);
        if (!mountedRef.current) return;
        setCurrentCall(session);

        const stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 24000,
          } as any,
          video: session.call_type === 'video' ? LOW_BANDWIDTH_VIDEO_CONSTRAINTS as any : false,
        });
        if (!mountedRef.current) {
          stream.release();
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraOn(session.call_type === 'video');

        const ws = new WebSocket(buildWebSocketUrl(`/ws/call/${room}/`, access));
        socket.current = ws;
        ws.onopen = () => {
          setStatus(session.status === 'ringing' ? 'Ringing…' : 'Connecting on low-data mode…');
          sendSignal({ type: 'ready' });
          for (const participant of session.participants) {
            const participantId = idOf(participant);
            if (participantId && currentId < participantId) void createOffer(participantId);
          }
        };
        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.call) {
              setCurrentCall(message.call as CallSession);
              if (message.event_type === 'call.participant_left' && message.user_id) removePeer(Number(message.user_id));
              return;
            }

            const payload = message.data || message;
            const type = message.event_type || payload.type;
            const senderId = Number(message.sender_id || 0);
            if (!senderId || senderId === currentId) return;

            if (type === 'network-quality') return;
            if (type === 'ready') {
              if (currentId < senderId) {
                offeredPeers.current.delete(senderId);
                await createOffer(senderId);
              }
              return;
            }
            if (type === 'offer') {
              const connection = createPeer(senderId);
              await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushCandidates(senderId, connection);
              const answer = await connection.createAnswer();
              const optimized = optimizedDescription(answer);
              await connection.setLocalDescription(optimized);
              sendSignal({ type: 'answer', target_id: senderId, sdp: optimized });
              return;
            }
            if (type === 'answer') {
              const connection = createPeer(senderId);
              await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              await flushCandidates(senderId, connection);
              return;
            }
            if (type === 'ice-candidate' && payload.candidate) {
              const connection = createPeer(senderId);
              const candidate = new RTCIceCandidate(payload.candidate);
              if (connection.remoteDescription) await connection.addIceCandidate(candidate);
              else pendingCandidates.current.set(senderId, [...(pendingCandidates.current.get(senderId) || []), candidate]);
              return;
            }
            if (type === 'hangup') removePeer(senderId);
          } catch (error) {
            showApiError(error, 'Call signalling failed');
          }
        };
        ws.onerror = () => setStatus('Signalling connection failed');
        ws.onclose = () => mountedRef.current && setStatus('Call signalling closed');
      } catch (error) {
        showApiError(error, 'Could not start camera or microphone');
        router.back();
      }
    };

    void setup();
    return () => {
      mountedRef.current = false;
      socket.current?.close();
      for (const connection of peers.current.values()) connection.close();
      peers.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current?.release();
    };
  }, [access, createOffer, createPeer, currentId, flushCandidates, removePeer, room, sendSignal, setCurrentCall]);

  useEffect(() => {
    const timer = setInterval(async () => {
      let worst: CallQuality = 'good';
      for (const [remoteId, peer] of peers.current.entries()) {
        const report = await (peer as any).getStats?.().catch(() => null);
        if (!report) continue;
        const sample = networkSample(statsSnapshots.current.get(remoteId), report);
        statsSnapshots.current.set(remoteId, sample.snapshot);
        const next = qualityFromMetrics(sample.metrics);
        if (next === 'critical' || (next === 'poor' && worst === 'good')) worst = next;
      }
      if (worst !== qualityRef.current) {
        qualityRef.current = worst;
        setQuality(worst);
        await Promise.all([...peers.current.values()].map((peer) => applyCallQuality(peer as any, worst)));
        sendSignal({ type: 'network-quality', profile: worst });
        setStatus(worst === 'critical' ? 'Very poor network · video reduced to protect audio' : worst === 'poor' ? 'Poor network · reducing video data' : 'Connected');
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [sendSignal]);

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !micOn; });
    setMicOn(!micOn);
    sendSignal({ type: 'media-state', audio: !micOn, video: cameraOn });
  };
  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => { track.enabled = !cameraOn; });
    setCameraOn(!cameraOn);
    sendSignal({ type: 'media-state', audio: micOn, video: !cameraOn });
  };
  const switchCamera = () => localStream?.getVideoTracks().forEach((track) => (track as any)._switchCamera?.());

  const hangup = async () => {
    sendSignal({ type: 'hangup' });
    try { await leaveCall(room); } catch { /* Socket hangup still closes the local call. */ }
    router.back();
  };

  const existingIds = useMemo(() => new Set((call?.participants || []).map(idOf)), [call?.participants]);
  const availableFriends = friends.filter((friend: Friend) => !existingIds.has(idOf(friend)));
  const toggleInvitee = (friendId: number) => setSelectedInvitees((current) => current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]);
  const invite = async () => {
    if (!selectedInvitees.length) return;
    setInviting(true);
    try {
      const updated = await inviteCallParticipants(room, selectedInvitees);
      setCurrentCall(updated);
      setSelectedInvitees([]);
      setInviteOpen(false);
      showSuccess('Invitation sent', 'They will see an incoming call and can join this conversation.');
    } catch (error) {
      showApiError(error, 'Could not add participants');
    } finally {
      setInviting(false);
    }
  };

  const remoteEntries = Object.entries(remoteStreams).map(([participantId, stream]) => ({ participantId: Number(participantId), stream }));
  const participantFor = (participantId: number) => call?.participants.find((participant) => idOf(participant) === participantId);
  const connectedCount = remoteEntries.length + 1;
  const qualityColor = quality === 'good' ? '#34D399' : quality === 'poor' ? '#FBBF24' : '#FB7185';

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.callName}>{name || displayName(call?.created_by)}</Text>
          <View style={styles.qualityRow}><Signal color={qualityColor} size={14} /><Text style={[styles.callMeta, { color: qualityColor }]}>{quality} network · {status} · {connectedCount} connected</Text></View>
        </View>
        <Pressable accessibilityLabel="Add participant" onPress={() => setInviteOpen(true)} style={styles.topAction}><UserPlus color="#fff" size={22} /></Pressable>
      </View>

      <View style={styles.stage}>
        {videoCall && remoteEntries.length ? (
          <FlatList
            contentContainerStyle={styles.videoGrid}
            data={remoteEntries}
            keyExtractor={(item) => String(item.participantId)}
            numColumns={remoteEntries.length > 1 ? 2 : 1}
            renderItem={({ item }) => (
              <View style={styles.remoteTile}>
                <RTCView mirror={false} objectFit="cover" streamURL={item.stream.toURL()} style={styles.remoteVideo} />
                <Text numberOfLines={1} style={styles.participantLabel}>{displayName(participantFor(item.participantId))}</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.audioStage}>
            <View style={styles.avatarGlow}><Avatar user={call?.participants.find((participant) => idOf(participant) !== currentId) || call?.created_by || undefined} size={126} /></View>
            <Text style={styles.waitingTitle}>{status}</Text>
            <Text style={styles.waitingSubtitle}>Starts at 480×270 and buffers more before dropping audio.</Text>
          </View>
        )}
        {videoCall && localStream && cameraOn ? <RTCView mirror objectFit="cover" streamURL={localStream.toURL()} style={styles.local} /> : null}
      </View>

      <View style={styles.controls}>
        <Control active={micOn} icon={micOn ? Mic : MicOff} label={micOn ? 'Mute' : 'Unmute'} onPress={toggleMic} />
        {videoCall ? <Control active={cameraOn} icon={cameraOn ? Camera : CameraOff} label={cameraOn ? 'Camera' : 'Camera off'} onPress={toggleCamera} /> : null}
        {videoCall ? <Control active icon={RefreshCw} label="Flip" onPress={switchCamera} /> : null}
        <View style={styles.controlBlock}>
          <Pressable accessibilityLabel="End call" onPress={hangup} style={[styles.control, styles.hangup]}><PhoneOff color="#fff" size={24} /></Pressable>
          <Text style={styles.controlLabel}>End</Text>
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setInviteOpen(false)} transparent visible={inviteOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.inviteSheet}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Add participants</Text><Text style={styles.sheetSubtitle}>Invite up to {Math.max(0, 8 - (call?.participants.length || 1))} more people</Text></View>
              <Pressable accessibilityLabel="Close" onPress={() => setInviteOpen(false)} style={styles.closeButton}><X color={colors.text} size={21} /></Pressable>
            </View>
            <FlatList
              data={availableFriends}
              keyExtractor={(item) => String(idOf(item))}
              ListEmptyComponent={<Text style={styles.emptyFriends}>Everyone available is already in the call.</Text>}
              renderItem={({ item }) => {
                const friendId = idOf(item);
                const selected = selectedInvitees.includes(friendId);
                return <Pressable onPress={() => toggleInvitee(friendId)} style={styles.friendRow}><Avatar user={item} size={46} /><View style={{ flex: 1 }}><Text style={styles.friendName}>{displayName(item)}</Text><Text style={styles.friendEmail}>{item.email}</Text></View><View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <Text style={styles.check}>✓</Text> : null}</View></Pressable>;
              }}
            />
            <Pressable disabled={!selectedInvitees.length || inviting} onPress={invite} style={[styles.inviteButton, (!selectedInvitees.length || inviting) && styles.disabled]}><Text style={styles.inviteButtonText}>{inviting ? 'Inviting…' : `Add ${selectedInvitees.length || ''} participant${selectedInvitees.length === 1 ? '' : 's'}`}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Control({ icon: Icon, onPress, active, label }: { icon: React.ElementType; onPress: () => void; active: boolean; label: string }) {
  return <View style={styles.controlBlock}><Pressable accessibilityLabel={label} onPress={onPress} style={[styles.control, !active && styles.inactive]}><Icon color="#fff" size={24} /></Pressable><Text style={styles.controlLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050816' },
  topBar: { minHeight: 76, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B1026' },
  callName: { color: '#fff', fontSize: 19, fontWeight: '900' },
  callMeta: { fontSize: 11, marginTop: 2, fontWeight: '700' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  topAction: { width: 44, height: 44, borderRadius: 18, backgroundColor: '#28304D', alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, position: 'relative', overflow: 'hidden' },
  videoGrid: { flexGrow: 1, padding: 6 },
  remoteTile: { flex: 1, minHeight: 250, margin: 4, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111827' },
  remoteVideo: { ...StyleSheet.absoluteFill },
  participantLabel: { position: 'absolute', left: 10, bottom: 10, color: '#fff', backgroundColor: 'rgba(5,8,22,.68)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '80%', fontSize: 11, fontWeight: '800' },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  avatarGlow: { padding: 10, borderRadius: 90, backgroundColor: 'rgba(48,87,213,.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,.13)' },
  waitingTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 24 },
  waitingSubtitle: { color: '#94A3B8', marginTop: 9, textAlign: 'center', lineHeight: 20 },
  local: { position: 'absolute', width: 112, height: 158, right: 14, top: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111827' },
  controls: { minHeight: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 17, paddingHorizontal: 12, backgroundColor: '#0B1026' },
  controlBlock: { alignItems: 'center', gap: 7 },
  control: { width: 56, height: 56, borderRadius: 22, backgroundColor: '#28304D', alignItems: 'center', justifyContent: 'center' },
  controlLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '700' },
  inactive: { backgroundColor: '#4B5563' },
  hangup: { backgroundColor: colors.danger },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,.58)' },
  inviteSheet: { height: '72%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: colors.text, fontSize: 21, fontWeight: '900' },
  sheetSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  friendRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  friendName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  friendEmail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  checkbox: { width: 25, height: 25, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: '#fff', fontWeight: '900' },
  inviteButton: { minHeight: 52, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  inviteButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  emptyFriends: { color: colors.muted, textAlign: 'center', padding: 30, lineHeight: 20 },
});
