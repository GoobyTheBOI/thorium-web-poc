import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { VoiceManagementService } from '../../lib/services/VoiceManagementService';
import { TEST_CONFIG } from '../../lib/constants/testConstants';
import { 
  MockAudioElement, 
  MockTextProcessor, 
  MockVoiceService,
  ElevenLabsAdapterWithPrivates 
} from '../types/adapterTestTypes';

jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsApi: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convertAsStream: jest.fn(),
    },
  })),
}));

describe('ElevenLabsAdapter', () => {
  let adapter: ElevenLabsAdapter;
  let mockTextProcessor: MockTextProcessor;
  let mockVoiceService: MockVoiceService;

  beforeEach(() => {
    mockTextProcessor = {
      formatText: jest.fn((text) => text),
      processText: jest.fn((text) => text),
      validateText: jest.fn(() => true), // Always return true for tests
    };

    mockVoiceService = {
      getVoices: jest.fn(() => Promise.resolve([])),
      setVoice: jest.fn(),
      getCurrentVoice: jest.fn(() => ({ id: TEST_CONFIG.TEST_DATA.VOICE_IDS.ELEVENLABS, name: 'Test Voice' }))
    };

    adapter = new ElevenLabsAdapter(mockTextProcessor, mockVoiceService as unknown as VoiceManagementService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    const currentAudio = (adapter as unknown as { currentAudio: HTMLAudioElement | null }).currentAudio;
    if (currentAudio) {
      currentAudio.pause();
      (adapter as unknown as { currentAudio: HTMLAudioElement | null }).currentAudio = null;
    }
  });

  describe('Text-to-Speech Processing', () => {
    test('play method processes text chunk correctly', async () => {
      const textChunk = {
        text: TEST_CONFIG.TEST_DATA.SIMPLE_TEXT,
        element: 'paragraph',
        index: 0
      };

      jest.spyOn(adapter as unknown as ElevenLabsAdapterWithPrivates, 'executePlayRequest').mockResolvedValue({
        requestId: 'test-request-id',
        audio: new Audio()
      });

      const result = await adapter.play(textChunk);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith(TEST_CONFIG.TEST_DATA.SIMPLE_TEXT, 'paragraph');
      expect(result).toEqual({ requestId: 'test-request-id' });
    });

    test('play method handles empty text', async () => {
      const textChunk = {
        text: '',
        element: 'paragraph',
        index: 0
      };

      jest.spyOn(adapter as unknown as ElevenLabsAdapterWithPrivates, 'executePlayRequest').mockResolvedValue({
        requestId: null,
        audio: new Audio()
      });

      const result = await adapter.play(textChunk);

      expect(result).toEqual({ requestId: null });
    });

    test('validateAndFormatText handles various input types', () => {
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText(TEST_CONFIG.TEST_DATA.SHORT_TEXT)).not.toThrow();
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText([TEST_CONFIG.TEST_DATA.SHORT_TEXT, 'World'])).not.toThrow();
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText({ text: TEST_CONFIG.TEST_DATA.SHORT_TEXT })).not.toThrow();
    });
  });

  describe('Audio Playback Control', () => {
    test('pause method pauses current audio', () => {
      const mockAudio: MockAudioElement = {
        pause: jest.fn(),
        play: jest.fn(),
        currentTime: 0,
        duration: 60
      };

      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = mockAudio as unknown as HTMLAudioElement;
      (adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying = true;

      adapter.pause();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(false);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(true);
    });

    test('resume method resumes paused audio', () => {
      const mockAudio: MockAudioElement = {
        pause: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        currentTime: 30,
        duration: 60
      };

      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = mockAudio as unknown as HTMLAudioElement;
      (adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused = true;

      adapter.resume();

      expect(mockAudio.play).toHaveBeenCalled();
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(true);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(false);
    });

    test('stop method stops and resets audio', () => {
      const mockAudio: MockAudioElement = {
        pause: jest.fn(),
        play: jest.fn(),
        currentTime: 30,
        duration: 60
      };

      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = mockAudio as unknown as HTMLAudioElement;
      (adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying = true;

      adapter.stop();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.currentTime).toBe(0);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(false);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(false);
    });

    test('handles operations when no audio is loaded', () => {
      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = null;

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

      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).eventListeners.get('play')).toContain(callback);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).eventListeners.get('pause')).toContain(callback);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).eventListeners.get('error')).toContain(callback);
    });

    test('off method removes event listeners', () => {
      const callback = jest.fn();

      adapter.on('play', callback);
      adapter.off('play', callback);

      const listeners = (adapter as unknown as ElevenLabsAdapterWithPrivates).eventListeners.get('play');
      expect(listeners).not.toContain(callback);
    });

    test('emitEvent triggers registered callbacks', () => {
      const callback = jest.fn();

      adapter.on('play', callback);
      (adapter as unknown as ElevenLabsAdapterWithPrivates).emitEvent('play', { test: 'data' });

      expect(callback).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('State Management', () => {
    test('updatePlaybackState manages internal state correctly', () => {
      (adapter as unknown as ElevenLabsAdapterWithPrivates).updatePlaybackState(true, false);

      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(true);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(false);

      (adapter as unknown as ElevenLabsAdapterWithPrivates).updatePlaybackState(false, true);

      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(false);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(true);
    });

    test('tracks audio state correctly during operations', () => {
      const mockAudio: MockAudioElement = {
        pause: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        currentTime: 0,
        duration: 60
      };

      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = mockAudio as unknown as HTMLAudioElement;
      (adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying = true;

      adapter.pause();
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(false);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(true);

      adapter.resume();
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(true);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(false);

      adapter.stop();
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPlaying).toBe(false);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('handles resume errors gracefully', () => {
      const mockAudio: MockAudioElement = {
        pause: jest.fn(),
        play: jest.fn().mockRejectedValue(new Error('Play failed')),
        currentTime: 0,
        duration: 60
      };

      const errorCallback = jest.fn();
      adapter.on('error', errorCallback);

      (adapter as unknown as ElevenLabsAdapterWithPrivates).currentAudio = mockAudio as unknown as HTMLAudioElement;
      (adapter as unknown as ElevenLabsAdapterWithPrivates).isPaused = true;

      adapter.resume();

      expect(mockAudio.play).toHaveBeenCalled();
    });

    test('handles invalid text input gracefully', () => {
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText(null)).not.toThrow();
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText(undefined)).not.toThrow();
      expect(() => (adapter as unknown as ElevenLabsAdapterWithPrivates).validateAndFormatText(123)).not.toThrow();
    });

    test('emits error events for failures', () => {
      const errorCallback = jest.fn();
      adapter.on('error', errorCallback);

      const testError = new Error('Test error');
      (adapter as unknown as ElevenLabsAdapterWithPrivates).emitEvent('error', { error: testError });

      expect(errorCallback).toHaveBeenCalledWith({ error: testError });
    });
  });

  describe('Configuration Management', () => {
    test('uses default configuration correctly', () => {
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).config.voiceId).toBe('EXAVITQu4vr4xnSDxMaL');
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).config.modelId).toBe(TEST_CONFIG.TEST_DATA.MODEL_IDS.ELEVENLABS_MULTILINGUAL);
      expect((adapter as unknown as ElevenLabsAdapterWithPrivates).config.apiKey).toBe('test-elevenlabs-key'); // From jest.setup.js
    });

    test('integrates with text processor', () => {
      const testText = TEST_CONFIG.TEST_DATA.SIMPLE_TEXT;
      const testElement = 'paragraph';

      (adapter as unknown as ElevenLabsAdapterWithPrivates).textProcessor.formatText(testText, testElement);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith(testText, testElement);
    });
  });
});
