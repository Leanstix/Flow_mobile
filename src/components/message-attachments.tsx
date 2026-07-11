import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Contact, FileText, Headphones, MapPin, Package } from 'lucide-react-native';

import { CachedImage, CachedVideo } from './media';
import { colors } from '@/theme';
import type { MessageAttachment } from '@/types';

function open(url?: string) {
  if (url) void Linking.openURL(url);
}

export function attachmentSummary(attachments?: MessageAttachment[]) {
  const first = attachments?.[0];
  if (!first) return '';
  if (first.kind === 'listing') return first.metadata?.title || 'Marketplace item';
  if (first.kind === 'location') return first.metadata?.label || 'Location';
  if (first.kind === 'contact') return first.metadata?.name || 'Contact';
  return first.file_name || first.kind;
}

export function MessageAttachments({ attachments = [], mine = false }: { attachments?: MessageAttachment[]; mine?: boolean }) {
  if (!attachments.length) return null;
  const foreground = mine ? '#fff' : colors.text;
  const muted = mine ? '#DDE4FF' : colors.muted;
  return <View style={styles.stack}>{attachments.map((item) => {
    if (item.kind === 'image') return <Pressable key={item.id} onPress={() => open(item.url)}><CachedImage source={item.thumbnail_url || item.url} style={styles.image} /></Pressable>;
    if (item.kind === 'video') return <CachedVideo key={item.id} source={item.url || ''} style={styles.video} />;
    if (item.kind === 'listing') {
      const listing = item.metadata || {};
      return <Pressable key={item.id} onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: String(listing.listing_id) } })} style={[styles.card, mine && styles.cardMine]}>{listing.image_url ? <CachedImage source={listing.image_url} style={styles.listingImage} /> : null}<View style={styles.cardBody}><View style={styles.cardTitleRow}><Package color={foreground} size={17} /><Text numberOfLines={1} style={[styles.cardTitle, { color: foreground }]}>Marketplace item</Text></View><Text numberOfLines={2} style={[styles.itemName, { color: foreground }]}>{listing.title || 'Listing'}</Text><Text style={[styles.meta, { color: muted }]}>{listing.price ? `₦${Number(listing.price).toLocaleString()}` : 'Contact seller'}</Text></View></Pressable>;
    }
    if (item.kind === 'location') {
      const latitude = item.metadata?.latitude;
      const longitude = item.metadata?.longitude;
      return <Pressable key={item.id} onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`)} style={[styles.rowCard, mine && styles.cardMine]}><MapPin color={foreground} size={22} /><View style={{ flex: 1 }}><Text style={[styles.itemName, { color: foreground }]}>{item.metadata?.label || 'Shared location'}</Text><Text style={[styles.meta, { color: muted }]}>{latitude}, {longitude}</Text></View></Pressable>;
    }
    if (item.kind === 'contact') return <View key={item.id} style={[styles.rowCard, mine && styles.cardMine]}><Contact color={foreground} size={22} /><View style={{ flex: 1 }}><Text style={[styles.itemName, { color: foreground }]}>{item.metadata?.name || 'Contact'}</Text><Text style={[styles.meta, { color: muted }]}>{item.metadata?.phone || item.metadata?.email}</Text></View></View>;
    if (item.kind === 'audio') return <Pressable key={item.id} onPress={() => open(item.url)} style={[styles.rowCard, mine && styles.cardMine]}><Headphones color={foreground} size={22} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.itemName, { color: foreground }]}>{item.file_name || 'Audio'}</Text><Text style={[styles.meta, { color: muted }]}>Tap to play · {item.duration_seconds ? `${Math.round(Number(item.duration_seconds))} sec` : 'audio file'}</Text></View></Pressable>;
    if (item.kind === 'document') return <Pressable key={item.id} onPress={() => open(item.url)} style={[styles.rowCard, mine && styles.cardMine]}><FileText color={foreground} size={22} /><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.itemName, { color: foreground }]}>{item.file_name || 'Document'}</Text><Text style={[styles.meta, { color: muted }]}>{item.mime_type || 'Tap to open'}</Text></View></Pressable>;
    return null;
  })}</View>;
}

const styles = StyleSheet.create({ stack: { gap: 8, marginBottom: 7 }, image: { width: 250, maxWidth: '100%', height: 220, borderRadius: 13 }, video: { width: 250, maxWidth: '100%', aspectRatio: 16 / 9, borderRadius: 13, backgroundColor: '#000' }, card: { overflow: 'hidden', borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFC' }, cardMine: { borderColor: 'rgba(255,255,255,.25)', backgroundColor: 'rgba(255,255,255,.12)' }, listingImage: { width: '100%', height: 130 }, cardBody: { padding: 11 }, cardTitleRow: { flexDirection: 'row', gap: 7, alignItems: 'center' }, cardTitle: { flex: 1, fontSize: 11, fontWeight: '900' }, rowCard: { minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8FAFC' }, itemName: { fontSize: 13, fontWeight: '900', marginTop: 4 }, meta: { fontSize: 11, marginTop: 3 } });
