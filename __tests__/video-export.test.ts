jest.mock('react-native-video-trim', () => ({
  trim: jest.fn(),
  deleteFile: jest.fn(),
}));

import { deleteFile, trim } from 'react-native-video-trim';
import {
  deleteGeneratedVideo,
  exportTrimmedVideo,
  normalizeLocalFileUri,
  normalizeNativeInputPath,
} from '@/lib/video-export';

const mockedTrim = trim as jest.MockedFunction<typeof trim>;
const mockedDelete = deleteFile as jest.MockedFunction<typeof deleteFile>;

describe('client-side video export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDelete.mockResolvedValue(true);
  });

  it('exports a precise local clip before returning an uploadable file', async () => {
    mockedTrim.mockResolvedValue({
      success: true,
      outputPath: '/data/user/0/com.leanstix.flow/files/trimmed.mp4',
      startTime: 20_000,
      endTime: 80_000,
      duration: 60_000,
    });

    const result = await exportTrimmedVideo({
      sourceUri: 'file:///storage/emulated/0/DCIM/source.mp4',
      startSeconds: 20,
      endSeconds: 80,
    });

    expect(mockedTrim).toHaveBeenCalledWith(
      '/storage/emulated/0/DCIM/source.mp4',
      expect.objectContaining({
        startTime: 20_000,
        endTime: 80_000,
        enablePreciseTrimming: true,
        outputExt: 'mp4',
      }),
    );
    expect(result.uri).toBe('file:///data/user/0/com.leanstix.flow/files/trimmed.mp4');
    expect(result.durationSeconds).toBe(60);
    expect(result.generatedPath).toBe('/data/user/0/com.leanstix.flow/files/trimmed.mp4');
  });

  it('refuses to export more than three minutes', async () => {
    await expect(exportTrimmedVideo({
      sourceUri: 'file:///source.mp4',
      startSeconds: 0,
      endSeconds: 181,
    })).rejects.toThrow(/3 minutes/);
    expect(mockedTrim).not.toHaveBeenCalled();
  });

  it('deletes an invalid native export instead of uploading it', async () => {
    mockedTrim.mockResolvedValue({
      success: true,
      outputPath: '/tmp/too-long.mp4',
      startTime: 0,
      endTime: 181_000,
      duration: 181_000,
    });

    await expect(exportTrimmedVideo({
      sourceUri: 'file:///source.mp4',
      startSeconds: 0,
      endSeconds: 180,
    })).rejects.toThrow(/between 1 second and 3 minutes/);
    expect(mockedDelete).toHaveBeenCalledWith('/tmp/too-long.mp4');
  });

  it('normalizes picker input, upload output and safely cleans generated files', async () => {
    expect(normalizeNativeInputPath('file:///storage/My%20Videos/source.mp4')).toBe('/storage/My Videos/source.mp4');
    expect(normalizeNativeInputPath('content://picker/video')).toBe('content://picker/video');
    expect(normalizeLocalFileUri('/tmp/video.mp4')).toBe('file:///tmp/video.mp4');
    expect(normalizeLocalFileUri('content://picker/video')).toBe('content://picker/video');
    await expect(deleteGeneratedVideo('/tmp/video.mp4')).resolves.toBe(true);
  });
});
