import { configureAudibleVideoPlayer } from '@/lib/video-playback';

describe('video playback audio', () => {
  it('explicitly enables full-volume post audio', () => {
    const player = { muted: true, volume: 0, audioMixingMode: 'auto' as const };

    configureAudibleVideoPlayer(player);

    expect(player).toEqual({ muted: false, volume: 1, audioMixingMode: 'doNotMix' });
  });
});
