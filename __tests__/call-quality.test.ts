import { applyCallQuality, optimizeSdp, qualityFromMetrics } from '@/lib/call-quality';

describe('mobile adaptive call quality', () => {
  it('protects the call when packet loss, RTT or bitrate are poor', () => {
    expect(qualityFromMetrics({ lossRatio: .13, rtt: .1, availableBitrate: 500000 })).toBe('critical');
    expect(qualityFromMetrics({ lossRatio: .05, rtt: .2, availableBitrate: 500000 })).toBe('poor');
    expect(qualityFromMetrics({ lossRatio: 0, rtt: .1, availableBitrate: 900000 })).toBe('good');
  });

  it('applies conservative native sender caps and jitter targets', async () => {
    const setParameters = jest.fn().mockResolvedValue(undefined);
    const videoSender = { track: { kind: 'video' }, getParameters: () => ({ encodings: [{}] }), setParameters };
    const receiver = { jitterBufferTarget: 0 };
    await applyCallQuality({ getSenders: () => [videoSender], getReceivers: () => [receiver] }, 'critical');
    expect(setParameters.mock.calls[0][0].encodings[0].maxBitrate).toBe(72000);
    expect(receiver.jitterBufferTarget).toBe(380);
  });

  it('adds video and resilient Opus SDP hints', () => {
    const sdp = 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10\r\n';
    const optimized = optimizeSdp(sdp);
    expect(optimized).toContain('b=AS:380');
    expect(optimized).toContain('useinbandfec=1');
    expect(optimized).toContain('usedtx=1');
  });
});
