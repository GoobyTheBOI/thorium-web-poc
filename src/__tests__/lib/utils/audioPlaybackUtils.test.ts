import { playUniversal, TextToAudioAdapter } from '@/lib/utils/audioPlaybackUtils';
import { TextChunk } from '@/preferences/types';
import { createError } from '@/lib/utils/errorUtils';

// Mock dependencies
jest.mock('@/lib/utils/errorUtils', () => ({
  createError: jest.fn((code: string, message: string, details?: unknown) => ({
    code,
    message,
    details
  }))
}));

// Type alias for mocked HTMLAudioElement properties
type MockAudioElementProps = 'addEventListener' | 'removeEventListener' | 'play' | 'pause' | 'currentTime' | 'duration' | 'volume';

describe('audioPlaybackUtils', () => {
  let mockAdapter: jest.Mocked<TextToAudioAdapter>;
  let mockAudio: jest.Mocked<Pick<HTMLAudioElement, MockAudioElementProps>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock audio element
    mockAudio = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      currentTime: 0,
      duration: 0,
      volume: 1,
    };

    // Create mock adapter
    mockAdapter = {
      setupAudioPlayback: jest.fn().mockResolvedValue(mockAudio as unknown as HTMLAudioElement),
      emitEvent: jest.fn(),
      cleanup: jest.fn(),
      playTextChunk: jest.fn().mockResolvedValue('text-result'),
    };
  });

  // Helper function to simulate successful audio ending
  const simulateAudioSuccess = (audio: jest.Mocked<Pick<HTMLAudioElement, MockAudioElementProps>>) => {
    setTimeout(() => {
      const endListener = (audio.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'ended')?.[1];
      if (endListener) endListener();
    }, 0);
  };

  // Helper function to simulate audio error
  const simulateAudioError = (audio: jest.Mocked<Pick<HTMLAudioElement, MockAudioElementProps>>, error: Error) => {
    setTimeout(() => {
      const errorListener = (audio.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'error')?.[1];
      if (errorListener) errorListener(error);
    }, 0);
  };

  describe('playUniversal', () => {
    it('should handle Blob input by playing pre-generated audio', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/wav' });
      const successResult = 'blob-success';

      // Mock successful audio playback
      mockAdapter.setupAudioPlayback.mockImplementation(async () => {
        const audio = mockAudio;
        simulateAudioSuccess(audio);
        return audio as unknown as HTMLAudioElement;
      });

      const result = await playUniversal(mockAdapter, blob, successResult);

      expect(mockAdapter.cleanup).toHaveBeenCalled();
      expect(mockAdapter.setupAudioPlayback).toHaveBeenCalledWith(blob);
      expect(mockAdapter.emitEvent).toHaveBeenCalledWith('end', { success: true });
      expect(result).toBe(successResult);
    });

    it('should handle TextChunk input by delegating to adapter', async () => {
      const textChunk: TextChunk = { text: 'Hello world' };
      const successResult = 'text-success';

      const result = await playUniversal(mockAdapter, textChunk, successResult);

      expect(mockAdapter.playTextChunk).toHaveBeenCalledWith(textChunk);
      expect(result).toBe('text-result');
      expect(mockAdapter.cleanup).not.toHaveBeenCalled();
      expect(mockAdapter.setupAudioPlayback).not.toHaveBeenCalled();
    });

    it('should handle audio playback errors gracefully', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/wav' });
      const successResult = 'success';
      const mockError = new Error('Playback failed');

      // Mock setupAudioPlayback to simulate error
      mockAdapter.setupAudioPlayback.mockImplementation(async () => {
        const audio = mockAudio;
        simulateAudioError(audio, mockError);
        return audio as unknown as HTMLAudioElement;
      });

      (createError as jest.Mock).mockReturnValue({
        code: 'PLAYBACK_FAILED',
        message: 'Audio playback failed',
        details: mockError
      });

      await expect(playUniversal(mockAdapter, blob, successResult)).rejects.toThrow('Audio playback failed');

      expect(mockAdapter.cleanup).toHaveBeenCalled();
      expect(mockAdapter.setupAudioPlayback).toHaveBeenCalledWith(blob);
      expect(mockAdapter.emitEvent).toHaveBeenCalledWith('end', {
        success: false,
        error: {
          code: 'PLAYBACK_FAILED',
          message: 'Audio playback failed',
          details: mockError
        }
      });
      expect(createError).toHaveBeenCalledWith('PLAYBACK_FAILED', 'Audio playback failed', mockError);
    });

    it('should properly clean up event listeners on success', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/wav' });
      const successResult = 'success';

      mockAdapter.setupAudioPlayback.mockImplementation(async () => {
        const audio = mockAudio;
        simulateAudioSuccess(audio);
        return audio as unknown as HTMLAudioElement;
      });

      await playUniversal(mockAdapter, blob, successResult);

      expect(mockAudio.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should properly clean up event listeners on error', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/wav' });
      const successResult = 'success';
      const mockError = new Error('Test error');

      mockAdapter.setupAudioPlayback.mockImplementation(async () => {
        const audio = mockAudio;
        simulateAudioError(audio, mockError);
        return audio as unknown as HTMLAudioElement;
      });

      await expect(playUniversal(mockAdapter, blob, successResult)).rejects.toThrow();
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockAudio.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle text chunks with different content', async () => {
      const textChunks = [
        { text: 'Simple text' },
        { text: 'Text with element', element: 'p' },
        { text: '' },
        { text: 'Long text with multiple words and punctuation!' }
      ];

      for (const chunk of textChunks) {
        await playUniversal(mockAdapter, chunk, 'success');
        expect(mockAdapter.playTextChunk).toHaveBeenCalledWith(chunk);
      }

      expect(mockAdapter.playTextChunk).toHaveBeenCalledTimes(4);
    });
  });
});
