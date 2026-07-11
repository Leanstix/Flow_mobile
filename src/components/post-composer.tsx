import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ImagePlus, Play, Scissors, Send, Video, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from './avatar';
import { CachedImage } from './media';
import { Card } from './ui';
import { createPostWithMedia, type NativeUpload, type PostMediaMetadata } from '@/lib/api';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/state/auth-store';
import { showApiError, showSuccess } from '@/state/ui-store';

const MAX_VIDEO_SECONDS = 180;
type SelectedMedia = NativeUpload & { kind: 'image' | 'video'; durationSeconds?: number; trimStart?: number; trimEnd?: number };

function secondsFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const duration = Number(asset.duration || 0);
  return duration > 0 ? duration / 1000 : 0;
}

function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function VideoTrimModal({ media, onClose, onSave }: { media: SelectedMedia; onClose: () => void; onSave: (start: number, end: number) => void }) {
  const duration = Math.max(media.durationSeconds || MAX_VIDEO_SECONDS, 1);
  const [start, setStart] = useState(media.trimStart || 0);
  const [end, setEnd] = useState(media.trimEnd || Math.min(duration, MAX_VIDEO_SECONDS));
  const player = useVideoPlayer({ uri: media.uri }, (instance) => { instance.loop = false; });
  const range = end - start;

  useEffect(() => {
    const timer = setInterval(() => {
      if (player.playing && player.currentTime >= end) {
        player.pause();
        player.currentTime = start;
      }
    }, 250);
    return () => clearInterval(timer);
  }, [end, player, start]);

  const changeStart = (next: number) => {
    const value = Math.max(0, Math.min(next, end - 1));
    setStart(value);
    if (end - value > MAX_VIDEO_SECONDS) setEnd(Math.min(duration, value + MAX_VIDEO_SECONDS));
  };
  const changeEnd = (next: number) => {
    const value = Math.min(duration, Math.max(next, start + 1));
    setEnd(Math.min(value, start + MAX_VIDEO_SECONDS));
  };
  const preview = () => { player.currentTime = start; player.play(); };
  const valid = range > 0 && range <= MAX_VIDEO_SECONDS;

  return <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible><View style={trimStyles.root}><View style={trimStyles.header}><View><Text style={trimStyles.title}>Trim video</Text><Text style={trimStyles.subtitle}>Choose up to 3 minutes</Text></View><Pressable onPress={onClose} style={trimStyles.close}><X color={colors.text} size={20} /></Pressable></View><VideoView nativeControls player={player} style={trimStyles.video} /><View style={trimStyles.rangeCard}><Text style={trimStyles.rangeLabel}>Selected clip: {formatSeconds(start)} – {formatSeconds(end)} ({formatSeconds(range)})</Text><View style={trimStyles.controlRow}><Text style={trimStyles.controlLabel}>Start</Text><Pressable onPress={() => changeStart(start - 5)} style={trimStyles.step}><Text style={trimStyles.stepText}>−5s</Text></Pressable><TextInput keyboardType="decimal-pad" onChangeText={(value) => changeStart(Number(value) || 0)} style={trimStyles.number} value={String(Math.round(start))} /><Pressable onPress={() => changeStart(start + 5)} style={trimStyles.step}><Text style={trimStyles.stepText}>+5s</Text></Pressable></View><View style={trimStyles.controlRow}><Text style={trimStyles.controlLabel}>End</Text><Pressable onPress={() => changeEnd(end - 5)} style={trimStyles.step}><Text style={trimStyles.stepText}>−5s</Text></Pressable><TextInput keyboardType="decimal-pad" onChangeText={(value) => changeEnd(Number(value) || start + 1)} style={trimStyles.number} value={String(Math.round(end))} /><Pressable onPress={() => changeEnd(end + 5)} style={trimStyles.step}><Text style={trimStyles.stepText}>+5s</Text></Pressable></View>{!valid ? <Text style={trimStyles.error}>The selected range must be between 1 second and 3 minutes.</Text> : null}</View><View style={trimStyles.actions}><Pressable onPress={preview} style={trimStyles.secondary}><Play color={colors.primary} size={18} /><Text style={trimStyles.secondaryText}>Preview clip</Text></Pressable><Pressable disabled={!valid} onPress={() => onSave(start, end)} style={[trimStyles.primary, !valid && { opacity: .45 }]}><Scissors color="#fff" size={18} /><Text style={trimStyles.primaryText}>Use trimmed video</Text></Pressable></View></View></Modal>;
}

export function PostComposer() {
  const user = useAuthStore((state) => state.session?.user);
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [trimming, setTrimming] = useState<SelectedMedia | null>(null);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { showApiError(new Error('Photo library permission is required.'), 'Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4, quality: .78 });
    if (result.canceled) return;
    setMedia(result.assets.slice(0, 4).map((asset, index) => ({ uri: asset.uri, name: asset.fileName || `flow-post-${index + 1}.jpg`, type: asset.mimeType || 'image/jpeg', kind: 'image' })));
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { showApiError(new Error('Media library permission is required.'), 'Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false, quality: .72 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const durationSeconds = secondsFromAsset(asset);
    const selected: SelectedMedia = { uri: asset.uri, name: asset.fileName || 'flow-post-video.mp4', type: asset.mimeType || 'video/mp4', kind: 'video', durationSeconds, trimStart: 0, trimEnd: Math.min(durationSeconds || MAX_VIDEO_SECONDS, MAX_VIDEO_SECONDS) };
    setMedia([selected]);
    setTrimming(selected);
  };

  const payload = useMemo(() => media.map<PostMediaMetadata>((item) => ({ duration_seconds: item.durationSeconds, trim_start_seconds: item.trimStart || 0, trim_end_seconds: item.trimEnd })), [media]);
  const create = useMutation({ mutationFn: () => createPostWithMedia(content.trim(), media, payload), onSuccess: () => { setContent(''); setMedia([]); client.invalidateQueries({ queryKey: ['feed'] }); showSuccess('Published', 'Your post is live on Flow.'); }, onError: (error) => showApiError(error, 'Could not publish') });
  const canPost = Boolean(content.trim() || media.length);

  return <Card style={styles.card}><View style={styles.row}><Avatar user={user} /><TextInput maxLength={10000} multiline onChangeText={setContent} placeholder="Share an update, #topic or @mention…" placeholderTextColor={colors.muted} style={styles.input} value={content} /></View>{media.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>{media.map((item) => item.kind === 'image' ? <CachedImage key={item.uri} source={item.uri} style={styles.preview} /> : <View key={item.uri} style={styles.videoPreview}><CachedImage source={{ uri: item.uri }} style={styles.preview} /><Pressable onPress={() => setTrimming(item)} style={styles.trimBadge}><Scissors color="#fff" size={15} /><Text style={styles.trimText}>{formatSeconds((item.trimEnd || 0) - (item.trimStart || 0))}</Text></Pressable></View>)}</ScrollView> : null}<View style={styles.footer}><View style={styles.tools}><Pressable onPress={pickImages} style={styles.tool}><ImagePlus color={colors.primary} size={19} /><Text style={styles.toolText}>Photos</Text></Pressable><Pressable onPress={pickVideo} style={styles.tool}><Video color={colors.primary} size={19} /><Text style={styles.toolText}>Video</Text></Pressable>{media.length ? <Pressable onPress={() => setMedia([])} style={styles.tool}><X color={colors.danger} size={18} /><Text style={[styles.toolText, { color: colors.danger }]}>Clear</Text></Pressable> : null}</View><Pressable disabled={!canPost || create.isPending} onPress={() => create.mutate()} style={[styles.publish, (!canPost || create.isPending) && { opacity: .45 }]}><Send color="#fff" size={17} /><Text style={styles.publishText}>{create.isPending ? 'Posting…' : 'Post'}</Text></Pressable></View>{trimming ? <VideoTrimModal media={trimming} onClose={() => setTrimming(null)} onSave={(start, end) => { setMedia((current) => current.map((item) => item.uri === trimming.uri ? { ...item, trimStart: start, trimEnd: end } : item)); setTrimming(null); }} /> : null}</Card>;
}

const styles = StyleSheet.create({ card: { gap: 14 }, row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, input: { flex: 1, minHeight: 76, color: colors.text, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' }, previewRow: { maxHeight: 132 }, preview: { width: 124, height: 124, borderRadius: 16, marginRight: 9 }, videoPreview: { position: 'relative' }, trimBadge: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(15,23,42,.82)', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 }, trimText: { color: '#fff', fontWeight: '800', fontSize: 11 }, footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, tools: { flexDirection: 'row', gap: 4, flex: 1 }, tool: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 12 }, toolText: { color: colors.primary, fontWeight: '800', fontSize: 12 }, publish: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.primary, borderRadius: 13, paddingHorizontal: 17, minHeight: 42 }, publishText: { color: '#fff', fontWeight: '800' } });
const trimStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: colors.text, fontSize: 26, fontWeight: '900' }, subtitle: { color: colors.muted, marginTop: 3 }, close: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 20, marginTop: 20 }, rangeCard: { marginTop: 18, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 }, rangeLabel: { color: colors.text, fontWeight: '900', textAlign: 'center' }, controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, controlLabel: { width: 42, color: colors.text, fontWeight: '800' }, step: { borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 9 }, stepText: { color: colors.primary, fontWeight: '800' }, number: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 11, textAlign: 'center', color: colors.text }, error: { color: colors.danger, fontSize: 12 }, actions: { marginTop: 'auto', flexDirection: 'row', gap: 10 }, secondary: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.primary, fontWeight: '900' }, primary: { flex: 1, minHeight: 50, borderRadius: 16, backgroundColor: colors.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontWeight: '900' } });
