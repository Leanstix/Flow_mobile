import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Contact, FileText, Headphones, ImagePlus, MapPin, Paperclip, Video, X } from 'lucide-react-native';

import { colors, spacing } from '@/theme';
import { showApiError } from '@/state/ui-store';
import type { MessageAttachmentKind } from '@/types';
import type { NativeUpload } from '@/lib/api';

export type AttachmentSelection = {
  kind: MessageAttachmentKind;
  files?: NativeUpload[];
  payload?: Record<string, any>;
  durationSeconds?: number;
};

const options = [
  { kind: 'image' as const, label: 'Photos', Icon: ImagePlus, tint: '#7C3AED' },
  { kind: 'video' as const, label: 'Video', Icon: Video, tint: '#EC4899' },
  { kind: 'document' as const, label: 'Document', Icon: FileText, tint: '#2563EB' },
  { kind: 'audio' as const, label: 'Audio', Icon: Headphones, tint: '#F59E0B' },
  { kind: 'contact' as const, label: 'Contact', Icon: Contact, tint: '#10B981' },
  { kind: 'location' as const, label: 'Location', Icon: MapPin, tint: '#EF4444' },
];

function assetUpload(asset: ImagePicker.ImagePickerAsset, fallback: string): NativeUpload {
  return { uri: asset.uri, name: asset.fileName || fallback, type: asset.mimeType || (fallback.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg') };
}

export function MessageAttachmentPicker({ disabled, onSelect }: { disabled?: boolean; onSelect: (selection: AttachmentSelection) => void }) {
  const [open, setOpen] = useState(false);
  const [structured, setStructured] = useState<'contact' | 'location' | null>(null);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [location, setLocation] = useState({ label: '', latitude: '', longitude: '' });

  const choose = async (kind: MessageAttachmentKind) => {
    try {
      if (kind === 'image' || kind === 'video') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error('Media library permission is required.');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: kind === 'image' ? ['images'] : ['videos'],
          allowsMultipleSelection: kind === 'image',
          selectionLimit: kind === 'image' ? 10 : 1,
          quality: .72,
        });
        if (result.canceled) return;
        const files = result.assets.map((asset, index) => assetUpload(asset, kind === 'video' ? 'flow-message-video.mp4' : `flow-message-photo-${index + 1}.jpg`));
        const durationSeconds = kind === 'video' ? Number(result.assets[0]?.duration || 0) / 1000 : undefined;
        if (kind === 'video' && durationSeconds && durationSeconds > 180) throw new Error('Message videos must be 3 minutes or shorter.');
        onSelect({ kind, files, durationSeconds });
        setOpen(false);
        return;
      }

      if (kind === 'document' || kind === 'audio') {
        const result = await DocumentPicker.getDocumentAsync({
          type: kind === 'audio' ? ['audio/*'] : [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'application/zip',
          ],
          multiple: kind === 'document',
          copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const files = result.assets.map((asset) => ({ uri: asset.uri, name: asset.name, type: asset.mimeType || (kind === 'audio' ? 'audio/mpeg' : 'application/octet-stream') }));
        onSelect({ kind, files });
        setOpen(false);
        return;
      }

      setOpen(false);
      setStructured(kind as 'contact' | 'location');
    } catch (error) {
      showApiError(error, 'Could not attach file');
    }
  };

  const submitStructured = () => {
    if (structured === 'contact') {
      if (!contact.name.trim() || (!contact.phone.trim() && !contact.email.trim())) return;
      onSelect({ kind: 'contact', payload: { name: contact.name.trim(), phone: contact.phone.trim(), email: contact.email.trim() } });
      setContact({ name: '', phone: '', email: '' });
    } else if (structured === 'location') {
      const latitude = Number(location.latitude);
      const longitude = Number(location.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      onSelect({ kind: 'location', payload: { label: location.label.trim() || 'Shared location', latitude, longitude } });
      setLocation({ label: '', latitude: '', longitude: '' });
    }
    setStructured(null);
  };

  return <>
    <Pressable accessibilityLabel="Attach" disabled={disabled} onPress={() => setOpen(true)} style={styles.attach}><Paperclip color={disabled ? colors.muted : colors.primary} size={21} /></Pressable>
    <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent visible={open}><Pressable onPress={() => setOpen(false)} style={styles.backdrop}><Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}><View style={styles.handle} /><Text style={styles.title}>Share</Text><View style={styles.grid}>{options.map(({ kind, label, Icon, tint }) => <Pressable key={kind} onPress={() => void choose(kind)} style={styles.option}><View style={[styles.icon, { backgroundColor: `${tint}18` }]}><Icon color={tint} size={24} /></View><Text style={styles.label}>{label}</Text></Pressable>)}</View></Pressable></Pressable></Modal>
    <Modal animationType="slide" onRequestClose={() => setStructured(null)} presentationStyle="pageSheet" visible={Boolean(structured)}><ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled"><View style={styles.formHeader}><Text style={styles.formTitle}>{structured === 'contact' ? 'Share contact' : 'Share location'}</Text><Pressable onPress={() => setStructured(null)} style={styles.close}><X color={colors.text} size={20} /></Pressable></View>{structured === 'contact' ? <><Field label="Name" value={contact.name} onChangeText={(value) => setContact((current) => ({ ...current, name: value }))} /><Field label="Phone" keyboardType="phone-pad" value={contact.phone} onChangeText={(value) => setContact((current) => ({ ...current, phone: value }))} /><Field label="Email" keyboardType="email-address" value={contact.email} onChangeText={(value) => setContact((current) => ({ ...current, email: value }))} /></> : <><Text style={styles.hint}>Enter the pin coordinates from your map application. The receiver can tap the attachment to open it in Maps.</Text><Field label="Label" value={location.label} onChangeText={(value) => setLocation((current) => ({ ...current, label: value }))} /><Field label="Latitude" keyboardType="decimal-pad" value={location.latitude} onChangeText={(value) => setLocation((current) => ({ ...current, latitude: value }))} /><Field label="Longitude" keyboardType="decimal-pad" value={location.longitude} onChangeText={(value) => setLocation((current) => ({ ...current, longitude: value }))} /></>}<Pressable onPress={submitStructured} style={styles.submit}><Text style={styles.submitText}>Share {structured}</Text></Pressable></ScrollView></Modal>
  </>;
}

function Field({ label, value, onChangeText, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: any }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput autoCapitalize="none" keyboardType={keyboardType} onChangeText={onChangeText} style={styles.input} value={value} /></View>;
}

const styles = StyleSheet.create({ attach: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,.45)' }, sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 34 }, handle: { width: 42, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center' }, title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 18, marginBottom: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, option: { width: '29%', alignItems: 'center', gap: 8 }, icon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, label: { color: colors.text, fontSize: 12, fontWeight: '800' }, form: { minHeight: '100%', backgroundColor: colors.background, padding: spacing.xl, gap: 16 }, formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, formTitle: { color: colors.text, fontSize: 26, fontWeight: '900' }, close: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, field: { gap: 7 }, fieldLabel: { color: colors.text, fontWeight: '800' }, input: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingHorizontal: 14, color: colors.text }, hint: { color: colors.muted, lineHeight: 20 }, submit: { minHeight: 50, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, submitText: { color: '#fff', fontWeight: '900', textTransform: 'capitalize' } });
