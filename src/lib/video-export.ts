import { deleteFile, trim } from 'react-native-video-trim';

export type LocalVideoExport = {
  uri: string;
  name: string;
  type: 'video/mp4';
  durationSeconds: number;
  generatedPath: string;
};

export function normalizeLocalFileUri(path: string) {
  if (!path) throw new Error('The video editor did not return an output file.');
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

export async function exportTrimmedVideo({
  sourceUri,
  startSeconds,
  endSeconds,
}: {
  sourceUri: string;
  startSeconds: number;
  endSeconds: number;
}): Promise<LocalVideoExport> {
  const durationSeconds = endSeconds - startSeconds;
  if (!sourceUri) throw new Error('Choose a video before trimming.');
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
    throw new Error('Trim start and end must be valid numbers.');
  }
  if (startSeconds < 0 || durationSeconds <= 0) {
    throw new Error('The trim range is invalid.');
  }
  if (durationSeconds > 180) {
    throw new Error('The final mobile video cannot exceed 3 minutes.');
  }

  const result = await trim(sourceUri, {
    startTime: Math.round(startSeconds * 1000),
    endTime: Math.round(endSeconds * 1000),
    outputExt: 'mp4',
    enablePreciseTrimming: true,
    saveToPhoto: false,
    removeAfterSavedToPhoto: false,
    removeAfterFailedToSavePhoto: false,
    removeAudio: false,
    speed: 1,
    type: 'video',
  });

  if (!result?.success || !result.outputPath) {
    throw new Error('The device could not export the trimmed video.');
  }

  const exportedDuration = Number(result.duration || durationSeconds * 1000) / 1000;
  if (exportedDuration <= 0 || exportedDuration > 180.25) {
    await deleteFile(result.outputPath).catch(() => false);
    throw new Error('The exported video must be between 1 second and 3 minutes.');
  }

  return {
    uri: normalizeLocalFileUri(result.outputPath),
    name: `flow-post-${Date.now()}.mp4`,
    type: 'video/mp4',
    durationSeconds: exportedDuration,
    generatedPath: result.outputPath,
  };
}

export async function deleteGeneratedVideo(path?: string | null) {
  if (!path) return false;
  try {
    return await deleteFile(path);
  } catch {
    return false;
  }
}
