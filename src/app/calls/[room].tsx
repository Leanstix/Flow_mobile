import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Camera, CameraOff, Copy, Mic, MicOff, PhoneOff, RefreshCw } from 'lucide-react-native';
import { mediaDevices, MediaStream, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView } from 'react-native-webrtc';
import { buildWebSocketUrl } from '@/lib/socket';
import { useAuthStore } from '@/state/auth-store';
import { colors } from '@/theme';
import { showApiError } from '@/state/ui-store';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  ...(process.env.EXPO_PUBLIC_TURN_URL ? [{ urls: process.env.EXPO_PUBLIC_TURN_URL, username: process.env.EXPO_PUBLIC_TURN_USERNAME, credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL }] : []),
];

export default function CallRoomScreen() {
  const { room, host } = useLocalSearchParams<{ room: string; host?: string }>();
  const access = useAuthStore((s) => s.session?.access);
  const peer = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [status, setStatus] = useState('Preparing your camera…');

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(payload));
  }, []);

  const createOffer = useCallback(async () => {
    if (!peer.current || !socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    const offer = await peer.current.createOffer();
    await peer.current.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: offer });
    setStatus('Waiting for the other student…');
  }, [sendSignal]);

  useEffect(() => {
    if (!room || !access) return;
    let mounted = true;
    const setup = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: 1280, height: 720, frameRate: 30 } });
        if (!mounted) { stream.release(); return; }
        localStreamRef.current = stream;
        setLocalStream(stream);
        const connection = new RTCPeerConnection({ iceServers });
        peer.current = connection;
        stream.getTracks().forEach((track) => connection.addTrack(track, stream));
        (connection as any).onicecandidate = (event: any) => { if (event.candidate) sendSignal({ type: 'ice-candidate', candidate: event.candidate.toJSON() }); };
        (connection as any).ontrack = (event: any) => { const first = event.streams?.[0]; if (first) setRemoteStream(first); };
        (connection as any).onconnectionstatechange = () => {
          const state = connection.connectionState;
          setStatus(state === 'connected' ? 'Connected' : state === 'failed' ? 'Connection failed' : state === 'disconnected' ? 'Reconnecting…' : 'Connecting…');
        };
        const ws = new WebSocket(buildWebSocketUrl(`/ws/call/${room}/`, access));
        socket.current = ws;
        ws.onopen = () => { setStatus(host === '1' ? 'Waiting for the other student…' : 'Joining call…'); if (host === '1') void createOffer(); };
        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          const payload = message.data || message;
          const type = message.event_type || payload.type;
          if (type === 'offer') {
            await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            sendSignal({ type: 'answer', sdp: answer });
          } else if (type === 'answer') {
            await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (type === 'hangup') {
            setStatus('The other participant ended the call');
            setTimeout(() => router.back(), 700);
          } else if (type === 'ice-candidate' && payload.candidate) {
            const candidate = new RTCIceCandidate(payload.candidate);
            if (connection.remoteDescription) await connection.addIceCandidate(candidate); else pendingCandidates.current.push(candidate);
          }
          if (connection.remoteDescription && pendingCandidates.current.length) {
            for (const candidate of pendingCandidates.current.splice(0)) await connection.addIceCandidate(candidate);
          }
        };
        ws.onerror = () => setStatus('Signalling connection failed');
        ws.onclose = () => mounted && setStatus('Call signalling closed');
      } catch (error) { showApiError(error, 'Could not start camera or microphone'); router.back(); }
    };
    void setup();
    return () => { mounted = false; socket.current?.close(); peer.current?.close(); localStreamRef.current?.getTracks().forEach((track) => track.stop()); localStreamRef.current?.release(); };
  }, [access, createOffer, host, room, sendSignal]);

  const toggleMic = () => { localStream?.getAudioTracks().forEach((track) => { track.enabled = !micOn; }); setMicOn(!micOn); };
  const toggleCamera = () => { localStream?.getVideoTracks().forEach((track) => { track.enabled = !cameraOn; }); setCameraOn(!cameraOn); };
  const switchCamera = () => localStream?.getVideoTracks().forEach((track) => (track as any)._switchCamera?.());
  const hangup = () => { sendSignal({ type: 'hangup' }); router.back(); };

  return <SafeAreaView style={styles.root}><View style={styles.stage}>{remoteStream ? <RTCView mirror={false} objectFit="cover" streamURL={remoteStream.toURL()} style={styles.remote} /> : <View style={styles.waiting}><Text style={styles.waitingTitle}>{status}</Text><Text style={styles.room}>Room: {room}</Text><Pressable onPress={() => Share.share({ message: `Join my Flow call with room code: ${room}` })} style={styles.share}><Copy color="#fff" size={18} /><Text style={styles.shareText}>Share room code</Text></Pressable></View>}{localStream && cameraOn ? <RTCView mirror objectFit="cover" streamURL={localStream.toURL()} style={styles.local} /> : null}<View style={styles.statusPill}><Text style={styles.statusText}>{status}</Text></View></View><View style={styles.controls}><Control active={micOn} icon={micOn ? Mic : MicOff} onPress={toggleMic} /><Control active={cameraOn} icon={cameraOn ? Camera : CameraOff} onPress={toggleCamera} /><Control active icon={RefreshCw} onPress={switchCamera} /><Pressable onPress={hangup} style={[styles.control, styles.hangup]}><PhoneOff color="#fff" size={24} /></Pressable></View></SafeAreaView>;
}
function Control({ icon: Icon, onPress, active }: { icon: React.ElementType; onPress: () => void; active: boolean }) { return <Pressable onPress={onPress} style={[styles.control, !active && styles.inactive]}><Icon color="#fff" size={24} /></Pressable>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#050816' }, stage: { flex: 1, position: 'relative', overflow: 'hidden' }, remote: { ...StyleSheet.absoluteFill }, waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, waitingTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' }, room: { color: '#94A3B8', marginTop: 12 }, share: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,.14)', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, marginTop: 22 }, shareText: { color: '#fff', fontWeight: '800' }, local: { position: 'absolute', width: 120, height: 170, right: 16, top: 22, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111827' }, statusPill: { position: 'absolute', left: 16, top: 22, backgroundColor: 'rgba(5,8,22,.72)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, statusText: { color: '#fff', fontSize: 12, fontWeight: '800' }, controls: { minHeight: 110, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 13, paddingHorizontal: 14, backgroundColor: '#0B1026' }, control: { width: 58, height: 58, borderRadius: 22, backgroundColor: '#28304D', alignItems: 'center', justifyContent: 'center' }, inactive: { backgroundColor: '#4B5563' }, hangup: { backgroundColor: colors.danger } });
