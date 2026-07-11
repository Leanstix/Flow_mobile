import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { CachedImage, CachedVideo } from './media';
import type { PostMedia } from '@/types';

const width = Dimensions.get('window').width - 64;

export function PostMediaView({ media = [] }: { media?: PostMedia[] }) {
  if (!media.length) return null;
  const video = media.find((item) => item.media_type === 'video');
  if (video) return <View style={styles.videoWrap}><CachedVideo source={video.url} style={styles.video} /></View>;
  const images = media.filter((item) => item.media_type === 'image').slice(0, 4);
  return <View style={[styles.grid, images.length === 1 && styles.single]}>{images.map((item) => <CachedImage key={item.id} source={item.thumbnail_url || item.url} style={images.length === 1 ? styles.singleImage : styles.image} />)}</View>;
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderRadius: 16, overflow: 'hidden' }, single: { display: 'flex' }, image: { width: (width - 2) / 2, height: (width - 2) / 2 }, singleImage: { width: '100%', height: Math.min(width * .8, 420) }, videoWrap: { overflow: 'hidden', borderRadius: 16, backgroundColor: '#000' }, video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' } });
