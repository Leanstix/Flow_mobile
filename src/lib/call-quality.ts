export type CallQuality = 'good' | 'poor' | 'critical';

export const CALL_PROFILES: Record<CallQuality, { videoBitrate: number; audioBitrate: number; frameRate: number; scale: number; jitterMs: number }> = {
  good: { videoBitrate: 360_000, audioBitrate: 28_000, frameRate: 15, scale: 1, jitterMs: 140 },
  poor: { videoBitrate: 160_000, audioBitrate: 20_000, frameRate: 10, scale: 1.6, jitterMs: 240 },
  critical: { videoBitrate: 72_000, audioBitrate: 14_000, frameRate: 7, scale: 2.5, jitterMs: 380 },
};

export const LOW_BANDWIDTH_VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 480, max: 640 },
  height: { ideal: 270, max: 360 },
  frameRate: { ideal: 12, max: 15 },
};

export function qualityFromMetrics({ rtt = 0, lossRatio = 0, availableBitrate = Number.POSITIVE_INFINITY }: { rtt?: number; lossRatio?: number; availableBitrate?: number } = {}): CallQuality {
  if (lossRatio >= 0.12 || rtt >= 0.75 || availableBitrate < 110_000) return 'critical';
  if (lossRatio >= 0.04 || rtt >= 0.35 || availableBitrate < 280_000) return 'poor';
  return 'good';
}

export function optimizeSdp(sdp = '') {
  let next = sdp.replace(/(m=video[^\r\n]*\r?\n)/, '$1b=AS:380\r\n');
  const opusPayload = next.match(/a=rtpmap:(\d+) opus\/48000/i)?.[1];
  if (opusPayload) {
    const fmtpPattern = new RegExp(`a=fmtp:${opusPayload} ([^\\r\\n]*)`, 'i');
    if (fmtpPattern.test(next)) next = next.replace(fmtpPattern, `a=fmtp:${opusPayload} $1;maxaveragebitrate=22000;useinbandfec=1;usedtx=1;stereo=0`);
    else next += `\r\na=fmtp:${opusPayload} maxaveragebitrate=22000;useinbandfec=1;usedtx=1;stereo=0`;
  }
  return next;
}

export async function applyCallQuality(peer: any, quality: CallQuality) {
  const profile = CALL_PROFILES[quality];
  const senders = typeof peer?.getSenders === 'function' ? peer.getSenders() : [];
  await Promise.all(senders.map(async (sender: any) => {
    const track = sender.track;
    if (!track || typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') return;
    const parameters = sender.getParameters() || {};
    parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
    if (track.kind === 'video') {
      parameters.encodings[0].maxBitrate = profile.videoBitrate;
      parameters.encodings[0].maxFramerate = profile.frameRate;
      parameters.encodings[0].scaleResolutionDownBy = profile.scale;
    } else if (track.kind === 'audio') {
      parameters.encodings[0].maxBitrate = profile.audioBitrate;
    }
    try { await sender.setParameters(parameters); } catch { /* Native WebRTC versions vary; SDP caps still apply. */ }
  }));

  const receivers = typeof peer?.getReceivers === 'function' ? peer.getReceivers() : [];
  receivers.forEach((receiver: any) => {
    if ('jitterBufferTarget' in receiver) {
      try { receiver.jitterBufferTarget = profile.jitterMs; } catch { /* Unsupported by this device. */ }
    }
  });
}

export function networkSample(previous: { sent: number; lost: number } | undefined, report: any) {
  let sent = 0;
  let lost = 0;
  let rtt = 0;
  let availableBitrate = Number.POSITIVE_INFINITY;
  const values: any[] = typeof report?.forEach === 'function' ? [] : Object.values(report || {});
  if (typeof report?.forEach === 'function') report.forEach((value: any) => values.push(value));
  values.forEach((stat) => {
    if (stat.type === 'remote-inbound-rtp') {
      sent += Number(stat.packetsReceived || 0);
      lost += Number(stat.packetsLost || 0);
      rtt = Math.max(rtt, Number(stat.roundTripTime || 0));
    }
    if (stat.type === 'candidate-pair' && (stat.state === 'succeeded' || stat.nominated)) {
      rtt = Math.max(rtt, Number(stat.currentRoundTripTime || 0));
      if (Number(stat.availableOutgoingBitrate || 0) > 0) availableBitrate = Math.min(availableBitrate, Number(stat.availableOutgoingBitrate));
    }
  });
  const deltaSent = Math.max(0, sent - (previous?.sent || 0));
  const deltaLost = Math.max(0, lost - (previous?.lost || 0));
  const total = deltaSent + deltaLost;
  return { snapshot: { sent, lost }, metrics: { rtt, availableBitrate, lossRatio: total ? deltaLost / total : 0 } };
}
