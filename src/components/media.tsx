import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

export function CachedImage(props: ImageProps) {
  return <Image cachePolicy="memory-disk" contentFit="cover" recyclingKey={typeof props.source === 'string' ? props.source : undefined} transition={180} {...props} />;
}

export function CachedVideo({ source, style }: { source: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer({ uri: source, useCaching: true });
  return <VideoView nativeControls player={player} style={style} />;
}
