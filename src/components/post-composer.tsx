import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ImagePlus, Play, Scissors, Send, Video, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from './avatar';
import { CachedImage } from './media';
import { MentionInput } from './mention-input';
import { Card } from './ui';
import { createPostWithMedia, type NativeUpload, type PostMediaMetadata } from '@/lib/api';
import { deleteGeneratedVideo, exportTrimmedVideo } from '@/lib/video-export';
import { configureAudibleVideoPlayer } from '@/lib/video-playback';
import { colors, spacing } from '@/theme';
import { useAuthStore } from '@/state/auth-store';
import { showApiError, showSuccess } from '@/state/ui-store';

const MAX_VIDEO_SECONDS = 180;

type SelectedMedia = NativeUpload & {
  kind: 'image' | 'video';
  durationSeconds?: number;
  sourceUri?: string;
  sourceDurationSeconds?: number;
  trimStartSeconds?: number;
  trimEndSeconds?: number;
  generatedPath?: string;
};

type EditableVideo = SelectedMedia & {
  sourceUri: string;
  sourceDurationSeconds: number;
  initialStartSeconds?: number;
  initialEndSeconds?: number;
};

function secondsFromAsset(asset: ImagePicker.ImagePickerAsset) {
  const duration = Number(asset.duration || 0);
  return duration > 0 ? duration / 1000 : 0;
}

function formatSeconds(value: number) {
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function LocalVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    configureAudibleVideoPlayer(instance);
  });

  return <VideoView nativeControls player={player} style={styles.preview} />;
}

function VideoTrimModal({
  media,
  onClose,
  onExport,
}: {
  media: EditableVideo;
  onClose: () => void;
  onExport: (startSeconds: number, endSeconds: number) => Promise<void>;
}) {
  const duration = Math.max(media.sourceDurationSeconds || MAX_VIDEO_SECONDS, 1);
  const [start, setStart] = useState(media.initialStartSeconds || 0);
  const [end, setEnd] = useState(
    media.initialEndSeconds || Math.min(duration, MAX_VIDEO_SECONDS),
  );
  const [exporting, setExporting] = useState(false);
  const player = useVideoPlayer({ uri: media.sourceUri }, (instance) => {
    instance.loop = false;
    configureAudibleVideoPlayer(instance);
  });
  const range = end - start;

  useEffect(() => {
    const timer = setInterval(() => {
      if (player.playing && player.currentTime >= end) {
        player.pause();
        player.seekBy(start - player.currentTime);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [end, player, start]);

  const changeStart = (next: number) => {
    const value = Math.max(0, Math.min(next, end - 1));
    setStart(value);
    if (end - value > MAX_VIDEO_SECONDS) {
      setEnd(Math.min(duration, value + MAX_VIDEO_SECONDS));
    }
  };

  const changeEnd = (next: number) => {
    const value = Math.min(duration, Math.max(next, start + 1));
    setEnd(Math.min(value, start + MAX_VIDEO_SECONDS));
  };

  const preview = () => {
    player.seekBy(start - player.currentTime);
    player.play();
  };

  const exportVideo = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await onExport(start, end);
    } finally {
      setExporting(false);
    }
  };

  const valid = range > 0 && range <= MAX_VIDEO_SECONDS;

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!exporting) onClose();
      }}
      presentationStyle="pageSheet"
      visible
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={trimStyles.root}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={trimStyles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
        >
          <View style={trimStyles.header}>
            <View style={trimStyles.headerCopy}>
              <Text style={trimStyles.title}>Edit video first</Text>
              <Text style={trimStyles.subtitle}>
                Flow exports the final clip on this device before uploading it.
              </Text>
            </View>
            <Pressable disabled={exporting} onPress={onClose} style={trimStyles.close}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <VideoView nativeControls player={player} style={trimStyles.video} />

          <View style={trimStyles.rangeCard}>
            <Text style={trimStyles.rangeLabel}>
              Final clip: {formatSeconds(start)} – {formatSeconds(end)} ({formatSeconds(range)})
            </Text>
            <View style={trimStyles.controlRow}>
              <Text style={trimStyles.controlLabel}>Start</Text>
              <Pressable disabled={exporting} onPress={() => changeStart(start - 5)} style={trimStyles.step}>
                <Text style={trimStyles.stepText}>−5s</Text>
              </Pressable>
              <TextInput
                editable={!exporting}
                keyboardType="decimal-pad"
                onChangeText={(value) => changeStart(Number(value) || 0)}
                style={trimStyles.number}
                value={String(Math.round(start))}
              />
              <Pressable disabled={exporting} onPress={() => changeStart(start + 5)} style={trimStyles.step}>
                <Text style={trimStyles.stepText}>+5s</Text>
              </Pressable>
            </View>
            <View style={trimStyles.controlRow}>
              <Text style={trimStyles.controlLabel}>End</Text>
              <Pressable disabled={exporting} onPress={() => changeEnd(end - 5)} style={trimStyles.step}>
                <Text style={trimStyles.stepText}>−5s</Text>
              </Pressable>
              <TextInput
                editable={!exporting}
                keyboardType="decimal-pad"
                onChangeText={(value) => changeEnd(Number(value) || start + 1)}
                style={trimStyles.number}
                value={String(Math.round(end))}
              />
              <Pressable disabled={exporting} onPress={() => changeEnd(end + 5)} style={trimStyles.step}>
                <Text style={trimStyles.stepText}>+5s</Text>
              </Pressable>
            </View>
            {!valid ? (
              <Text style={trimStyles.error}>
                The final clip must be between 1 second and 3 minutes.
              </Text>
            ) : null}
          </View>

          <View style={trimStyles.notice}>
            <Text style={trimStyles.noticeTitle}>Nothing has been uploaded yet</Text>
            <Text style={trimStyles.noticeText}>
              Trimming and precise re-encoding happen locally. Only the exported MP4 is sent when you publish.
            </Text>
          </View>

          <View style={trimStyles.actions}>
            <Pressable disabled={exporting} onPress={preview} style={trimStyles.secondary}>
              <Play color={colors.primary} size={18} />
              <Text style={trimStyles.secondaryText}>Preview range</Text>
            </Pressable>
            <Pressable
              disabled={!valid || exporting}
              onPress={() => void exportVideo()}
              style={[trimStyles.primary, (!valid || exporting) && { opacity: 0.45 }]}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Scissors color="#fff" size={18} />
              )}
              <Text style={trimStyles.primaryText}>
                {exporting ? 'Exporting on device…' : 'Export final video'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PostComposer() {
  const user = useAuthStore((state) => state.session?.user);
  const client = useQueryClient();
  const generatedPaths = useRef(new Set<string>());
  const [content, setContent] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState<number[]>([]);
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [trimming, setTrimming] = useState<EditableVideo | null>(null);

  useEffect(() => () => {
    generatedPaths.current.forEach((path) => {
      void deleteGeneratedVideo(path);
    });
    generatedPaths.current.clear();
  }, []);

  const cleanGeneratedMedia = async (items: SelectedMedia[]) => {
    await Promise.all(items.map(async (item) => {
      if (!item.generatedPath) return;
      await deleteGeneratedVideo(item.generatedPath);
      generatedPaths.current.delete(item.generatedPath);
    }));
  };

  const clearMedia = async () => {
    const current = media;
    setMedia([]);
    await cleanGeneratedMedia(current);
  };

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showApiError(new Error('Photo library permission is required.'), 'Permission needed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.78,
    });
    if (result.canceled) return;
    await clearMedia();
    setMedia(result.assets.slice(0, 4).map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName || `flow-post-${index + 1}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      kind: 'image',
    })));
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showApiError(new Error('Media library permission is required.'), 'Permission needed');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.72,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const sourceDurationSeconds = secondsFromAsset(asset);
    if (!sourceDurationSeconds) {
      showApiError(new Error('Flow could not read this video duration.'), 'Video cannot be edited');
      return;
    }

    setTrimming({
      uri: asset.uri,
      sourceUri: asset.uri,
      name: asset.fileName || 'flow-source-video.mp4',
      type: asset.mimeType || 'video/mp4',
      kind: 'video',
      sourceDurationSeconds,
      initialStartSeconds: 0,
      initialEndSeconds: Math.min(sourceDurationSeconds, MAX_VIDEO_SECONDS),
    });
  };

  const exportVideo = async (startSeconds: number, endSeconds: number) => {
    if (!trimming) return;
    try {
      const exported = await exportTrimmedVideo({
        sourceUri: trimming.sourceUri,
        startSeconds,
        endSeconds,
      });

      const previous = media;
      generatedPaths.current.add(exported.generatedPath);
      setMedia([{
        uri: exported.uri,
        name: exported.name,
        type: exported.type,
        kind: 'video',
        durationSeconds: exported.durationSeconds,
        sourceUri: trimming.sourceUri,
        sourceDurationSeconds: trimming.sourceDurationSeconds,
        trimStartSeconds: startSeconds,
        trimEndSeconds: endSeconds,
        generatedPath: exported.generatedPath,
      }]);
      setTrimming(null);
      await cleanGeneratedMedia(previous);
      showSuccess('Video ready', 'The final trimmed file is stored locally and ready to upload.');
    } catch (error) {
      showApiError(error, 'Could not export the video');
    }
  };

  const editExportedVideo = (item: SelectedMedia) => {
    if (item.kind !== 'video' || !item.sourceUri) return;
    const sourceDurationSeconds = item.sourceDurationSeconds || item.durationSeconds || 0;
    if (!sourceDurationSeconds) return;
    setTrimming({
      ...item,
      sourceUri: item.sourceUri,
      sourceDurationSeconds,
      initialStartSeconds: item.trimStartSeconds || 0,
      initialEndSeconds: item.trimEndSeconds || Math.min(sourceDurationSeconds, MAX_VIDEO_SECONDS),
    });
  };

  const payload = useMemo(
    () => media.map<PostMediaMetadata>((item) => (
      item.kind === 'video' ? { duration_seconds: item.durationSeconds } : {}
    )),
    [media],
  );

  const create = useMutation({
    mutationFn: () => createPostWithMedia(content.trim(), media, payload, mentionUserIds),
    onSuccess: async () => {
      const uploadedMedia = media;
      setContent('');
      setMentionUserIds([]);
      setMedia([]);
      await cleanGeneratedMedia(uploadedMedia);
      client.invalidateQueries({ queryKey: ['feed'] });
      showSuccess('Published', 'Your post is now live in the campus feed.');
    },
    onError: (error) => showApiError(error, 'Could not publish'),
  });

  const canPost = Boolean(content.trim() || media.length);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar user={user} />
        <MentionInput
          maxLength={10000}
          multiline
          onChangeText={setContent}
          onMentionUserIdsChange={setMentionUserIds}
          placeholder="Share an update, #topic or @mention…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={content}
        />
      </View>

      {media.length ? (
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={styles.previewRow}>
          {media.map((item) => (
            item.kind === 'image' ? (
              <CachedImage key={item.uri} source={item.uri} style={styles.preview} />
            ) : (
              <View key={item.uri} style={styles.videoPreview}>
                <LocalVideoPreview uri={item.uri} />
                <Pressable onPress={() => editExportedVideo(item)} style={styles.trimBadge}>
                  <Scissors color="#fff" size={15} />
                  <Text style={styles.trimText}>{formatSeconds(item.durationSeconds || 0)}</Text>
                </Pressable>
                <View style={styles.localBadge}>
                  <Text style={styles.localBadgeText}>EDITED LOCALLY</Text>
                </View>
              </View>
            )
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.tools}>
          <Pressable disabled={create.isPending} onPress={() => void pickImages()} style={styles.tool}>
            <ImagePlus color={colors.primary} size={19} />
            <Text style={styles.toolText}>Photos</Text>
          </Pressable>
          <Pressable disabled={create.isPending} onPress={() => void pickVideo()} style={styles.tool}>
            <Video color={colors.primary} size={19} />
            <Text style={styles.toolText}>Video</Text>
          </Pressable>
          {media.length ? (
            <Pressable disabled={create.isPending} onPress={() => void clearMedia()} style={styles.tool}>
              <X color={colors.danger} size={18} />
              <Text style={[styles.toolText, { color: colors.danger }]}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          disabled={!canPost || create.isPending || Boolean(trimming)}
          onPress={() => create.mutate()}
          style={[
            styles.publish,
            (!canPost || create.isPending || Boolean(trimming)) && { opacity: 0.45 },
          ]}
        >
          {create.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Send color="#fff" size={17} />
          )}
          <Text style={styles.publishText}>{create.isPending ? 'Uploading…' : 'Post'}</Text>
        </Pressable>
      </View>

      {trimming ? (
        <VideoTrimModal
          media={trimming}
          onClose={() => setTrimming(null)}
          onExport={exportVideo}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, zIndex: 20 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', zIndex: 20 },
  input: {
    flex: 1,
    minHeight: 76,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  previewRow: { maxHeight: 132 },
  preview: { width: 124, height: 124, borderRadius: 16, marginRight: 9, backgroundColor: '#000' },
  videoPreview: { position: 'relative' },
  trimBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,.82)',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  trimText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  localBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(16,185,129,.9)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  localBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  tools: { flexDirection: 'row', gap: 4, flex: 1 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toolText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  publish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: 13,
    paddingHorizontal: 17,
    minHeight: 42,
  },
  publishText: { color: '#fff', fontWeight: '800' },
});

const trimStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 3, lineHeight: 19, maxWidth: 280 },
  close: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 20,
    marginTop: 20,
  },
  rangeCard: {
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  rangeLabel: { color: colors.text, fontWeight: '900', textAlign: 'center' },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlLabel: { width: 42, color: colors.text, fontWeight: '800' },
  step: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  stepText: { color: colors.primary, fontWeight: '800' },
  number: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    textAlign: 'center',
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12 },
  notice: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 13,
  },
  noticeTitle: { color: '#047857', fontWeight: '900', fontSize: 13 },
  noticeText: { color: '#047857', marginTop: 4, lineHeight: 18, fontSize: 12 },
  actions: { marginTop: 22, flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '900' },
  primary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
