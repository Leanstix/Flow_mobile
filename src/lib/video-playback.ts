import type { VideoPlayer } from 'expo-video';

type AudibleVideoPlayer = Pick<VideoPlayer, 'audioMixingMode' | 'muted' | 'volume'>;

export function configureAudibleVideoPlayer(player: AudibleVideoPlayer) {
  player.muted = false;
  player.volume = 1;
  player.audioMixingMode = 'doNotMix';
}
