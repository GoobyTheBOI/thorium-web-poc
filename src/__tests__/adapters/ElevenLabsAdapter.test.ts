import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';

jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsApi: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convertAsStream: jest.fn(),
    },
  })),
}));

describe('ElevenLabsAdapter', () => {
  let adapter: ElevenLabsAdapter;
  let mockConfig: any;
  let mockTextProcessor: any;

  beforeEach(() => {
    mockConfig = {
      voiceId: 'test-voice-id',
      modelId: 'eleven_multilingual_v2',
      apiKey: 'test-api-key'
    };

    mockTextProcessor = {
      formatText: jest.fn((text) => text),
      processText: jest.fn((text) => text),
      validateText: jest.fn((text) => true), // Always return true for tests
    };

    adapter = new ElevenLabsAdapter(mockTextProcessor);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if ((adapter as any).currentAudio) {
      (adapter as any).currentAudio.pause();
      (adapter as any).currentAudio = null;
    }
  });

  describe('Text-to-Speech Processing', () => {
    test('play method processes text chunk correctly', async () => {
      const textChunk = {
        text: 'Hello world',
        element: 'paragraph',
        index: 0
      };

      jest.spyOn(adapter as any, 'executePlayRequest').mockResolvedValue({
        requestId: 'test-request-id',
        audio: new Audio()
      });

      const result = await adapter.play(textChunk);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith('Hello world', 'paragraph');
      expect(result).toEqual({ requestId: 'test-request-id' });
    });

    test('play method handles empty text', async () => {
      const textChunk = {
        text: '',
        element: 'paragraph',
        index: 0
      };

      jest.spyOn(adapter as any, 'executePlayRequest').mockResolvedValue({
        requestId: null,
        audio: new Audio()
      });

      const result = await adapter.play(textChunk);

      expect(result).toEqual({ requestId: null });
    });

    test('validateAndFormatText handles various input types', () => {
      expect(() => (adapter as any).validateAndFormatText('Hello')).not.toThrow();
      expect(() => (adapter as any).validateAndFormatText(['Hello', 'World'])).not.toThrow();
      expect(() => (adapter as any).validateAndFormatText({ text: 'Hello' })).not.toThrow();
    });
  });

  describe('Audio Playback Control', () => {
    test('pause method pauses current audio', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn(),
        currentTime: 0,
        duration: 60
      };

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).isPlaying = true;

      adapter.pause();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(true);
    });

    test('resume method resumes paused audio', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        currentTime: 30,
        duration: 60
      };

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).isPaused = true;

      adapter.resume();

      expect(mockAudio.play).toHaveBeenCalled();
      expect((adapter as any).isPlaying).toBe(true);
      expect((adapter as any).isPaused).toBe(false);
    });

    test('stop method stops and resets audio', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn(),
        currentTime: 30,
        duration: 60
      };

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).isPlaying = true;

      adapter.stop();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(false);
    });

    test('handles operations when no audio is loaded', () => {
      (adapter as any).currentAudio = null;

      expect(() => adapter.pause()).not.toThrow();
      expect(() => adapter.resume()).not.toThrow();
      expect(() => adapter.stop()).not.toThrow();
    });
  });

  describe('Event Management', () => {
    test('on method registers event listeners', () => {
      const callback = jest.fn();

      adapter.on('play', callback);
      adapter.on('pause', callback);
      adapter.on('error', callback);

      expect((adapter as any).eventListeners.get('play')).toContain(callback);
      expect((adapter as any).eventListeners.get('pause')).toContain(callback);
      expect((adapter as any).eventListeners.get('error')).toContain(callback);
    });

    test('off method removes event listeners', () => {
      const callback = jest.fn();

      adapter.on('play', callback);
      adapter.off('play', callback);

      const listeners = (adapter as any).eventListeners.get('play');
      expect(listeners).not.toContain(callback);
    });

    test('emitEvent triggers registered callbacks', () => {
      const callback = jest.fn();

      adapter.on('play', callback);
      (adapter as any).emitEvent('play', { test: 'data' });

      expect(callback).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('State Management', () => {
    test('updatePlaybackState manages internal state correctly', () => {
      (adapter as any).updatePlaybackState(true, false);

      expect((adapter as any).isPlaying).toBe(true);
      expect((adapter as any).isPaused).toBe(false);

      (adapter as any).updatePlaybackState(false, true);

      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(true);
    });

    test('tracks audio state correctly during operations', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        currentTime: 0,
        duration: 60
      };

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).isPlaying = true;

      adapter.pause();
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(true);

      adapter.resume();
      expect((adapter as any).isPlaying).toBe(true);
      expect((adapter as any).isPaused).toBe(false);

      adapter.stop();
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('handles resume errors gracefully', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn().mockRejectedValue(new Error('Play failed')),
        currentTime: 0,
        duration: 60
      };

      const errorCallback = jest.fn();
      adapter.on('error', errorCallback);

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).isPaused = true;

      adapter.resume();

      expect(mockAudio.play).toHaveBeenCalled();
    });

    test('handles invalid text input gracefully', () => {
      expect(() => (adapter as any).validateAndFormatText(null)).not.toThrow();
      expect(() => (adapter as any).validateAndFormatText(undefined)).not.toThrow();
      expect(() => (adapter as any).validateAndFormatText(123)).not.toThrow();
    });

    test('emits error events for failures', () => {
      const errorCallback = jest.fn();
      adapter.on('error', errorCallback);

      const testError = new Error('Test error');
      (adapter as any).emitEvent('error', { error: testError });

      expect(errorCallback).toHaveBeenCalledWith({ error: testError });
    });
  });

  describe('Configuration Management', () => {
    test('uses default configuration correctly', () => {
      expect((adapter as any).config.voiceId).toBe('JBFqnCBsd6RMkjVDRZzb');
      expect((adapter as any).config.modelId).toBe('eleven_multilingual_v2');
      expect((adapter as any).config.apiKey).toBe('test-elevenlabs-key'); // From jest.setup.js
    });

    test('integrates with text processor', () => {
      const testText = 'Hello world';
      const testElement = 'paragraph';

      (adapter as any).textProcessor.formatText(testText, testElement);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith(testText, testElement);
    });
  });
});
