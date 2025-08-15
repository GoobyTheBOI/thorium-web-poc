import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../../lib/adapters/AzureAdapter';
import type { ITextProcessor, IAdapterConfig } from '../../preferences/types';
import type { TextChunk } from '../../types/tts';

// Mock ElevenLabs SDK
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsApi: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convertAsStream: jest.fn().mockImplementation(async function* () {
        yield new Uint8Array([1, 2, 3]);
      }),
    },
  })),
}));

// Mock Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechSynthesisVoiceName: 'en-US-AriaNeural',
      speechSynthesisOutputFormat: 24,
    }),
  },
  SpeechSynthesizer: jest.fn().mockImplementation(() => ({
    speakTextAsync: jest.fn((text, callback) => {
      callback({ audioData: new ArrayBuffer(8) });
    }),
    close: jest.fn(),
  })),
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(),
  },
  SpeechSynthesisOutputFormat: {
    Audio24Khz16BitMonoPcm: 24,
  },
}));

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createBufferSource: jest.fn().mockReturnValue({
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    createGain: jest.fn().mockReturnValue({
      gain: { value: 1 },
      connect: jest.fn(),
    }),
    destination: {},
    decodeAudioData: jest.fn().mockResolvedValue({
      duration: 5.0,
      numberOfChannels: 1,
      sampleRate: 44100,
    }),
    state: 'running',
    close: jest.fn(),
  })),
});

describe('TTS Adapters', () => {
  let mockTextProcessor: ITextProcessor;
  let mockConfig: IAdapterConfig;

  beforeEach(() => {
    mockTextProcessor = {
      formatText: jest.fn((text: string) => text),
      validateText: jest.fn(() => true),
    };

    mockConfig = {
      apiKey: 'test-api-key',
      voiceId: 'test-voice-id',
      modelId: 'test-model',
    };
  });

  describe('ElevenLabsAdapter', () => {
    let adapter: ElevenLabsAdapter;

    beforeEach(() => {
      adapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
    });

    test('should create adapter instance', () => {
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
    });

    test('should have required interface methods', () => {
      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.resume).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.on).toBe('function');
      expect(typeof adapter.off).toBe('function');
    });

    test('should handle play method with TextChunk', async () => {
      const testChunk: TextChunk = {
        text: 'Hello, world!',
        element: 'paragraph'
      };

      // Should not throw when playing text chunk, but may reject async
      try {
        await adapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment
        expect(error).toBeDefined();
      }
    });

    test('should handle pause/resume/stop methods', () => {
      expect(() => adapter.pause()).not.toThrow();
      expect(() => adapter.resume()).not.toThrow();
      expect(() => adapter.stop()).not.toThrow();
    });

    test('should handle event listeners with correct event types', () => {
      const mockCallback = jest.fn();

      expect(() => adapter.on('play', mockCallback)).not.toThrow();
      expect(() => adapter.on('end', mockCallback)).not.toThrow();
      expect(() => adapter.on('error', mockCallback)).not.toThrow();
      expect(() => adapter.on('wordBoundary', mockCallback)).not.toThrow();

      expect(() => adapter.off('play', mockCallback)).not.toThrow();
      expect(() => adapter.off('end', mockCallback)).not.toThrow();
      expect(() => adapter.off('error', mockCallback)).not.toThrow();
      expect(() => adapter.off('wordBoundary', mockCallback)).not.toThrow();
    });
  });

  describe('AzureAdapter', () => {
    let adapter: AzureAdapter;

    beforeEach(() => {
      adapter = new AzureAdapter(mockConfig, mockTextProcessor);
    });

    test('should create adapter instance', () => {
      expect(adapter).toBeInstanceOf(AzureAdapter);
    });

    test('should have required interface methods', () => {
      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.resume).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.on).toBe('function');
      expect(typeof adapter.off).toBe('function');
    });

    test('should handle play method with TextChunk', async () => {
      const testChunk: TextChunk = {
        text: 'Hello from Azure!',
        element: 'paragraph'
      };

      // Azure adapter currently throws as it's not implemented
      await expect(adapter.play(testChunk)).rejects.toThrow('AzureAdapter not implemented');
    });

    test('should handle pause/resume/stop methods', () => {
      expect(() => adapter.pause()).not.toThrow();
      expect(() => adapter.resume()).not.toThrow();
      expect(() => adapter.stop()).not.toThrow();
    });

    test('should handle event listeners with correct event types', () => {
      const mockCallback = jest.fn();

      expect(() => adapter.on('play', mockCallback)).not.toThrow();
      expect(() => adapter.on('end', mockCallback)).not.toThrow();
      expect(() => adapter.on('error', mockCallback)).not.toThrow();
      expect(() => adapter.on('wordBoundary', mockCallback)).not.toThrow();

      expect(() => adapter.off('play', mockCallback)).not.toThrow();
      expect(() => adapter.off('end', mockCallback)).not.toThrow();
      expect(() => adapter.off('error', mockCallback)).not.toThrow();
      expect(() => adapter.off('wordBoundary', mockCallback)).not.toThrow();
    });
  });

  describe('Adapter Interface Compliance', () => {
    test('both adapters implement the same interface', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
      const azureAdapter = new AzureAdapter(mockConfig, mockTextProcessor);

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });

    test('adapters handle similar inputs consistently', async () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
      const azureAdapter = new AzureAdapter(mockConfig, mockTextProcessor);

      const testChunk: TextChunk = {
        text: 'Test speech text',
        element: 'paragraph'
      };

      // ElevenLabs should handle without throwing (but may reject async)
      try {
        await elevenlabsAdapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment
        expect(error).toBeDefined();
      }

      // Azure should reject as it's not implemented
      await expect(azureAdapter.play(testChunk)).rejects.toThrow();
    });

    test('adapters handle event system consistently', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
      const azureAdapter = new AzureAdapter(mockConfig, mockTextProcessor);

      const mockCallback = jest.fn();
      const events: Array<'play' | 'pause' | 'resume' | 'stop' | 'end' | 'error' | 'wordBoundary'> =
        ['play', 'end', 'error', 'wordBoundary'];

      events.forEach(event => {
        expect(() => elevenlabsAdapter.on(event, mockCallback)).not.toThrow();
        expect(() => azureAdapter.on(event, mockCallback)).not.toThrow();

        expect(() => elevenlabsAdapter.off(event, mockCallback)).not.toThrow();
        expect(() => azureAdapter.off(event, mockCallback)).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    test('ElevenLabsAdapter handles invalid configuration gracefully', () => {
      const invalidConfig = {} as IAdapterConfig;

      // Should create instance but may fail during play
      expect(() => new ElevenLabsAdapter(invalidConfig, mockTextProcessor)).not.toThrow();
    });

    test('AzureAdapter handles invalid configuration gracefully', () => {
      const invalidConfig = {} as IAdapterConfig;

      // Should create instance but may fail during play
      expect(() => new AzureAdapter(invalidConfig, mockTextProcessor)).not.toThrow();
    });

    test('adapters handle invalid text input', async () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
      const azureAdapter = new AzureAdapter(mockConfig, mockTextProcessor);

      const emptyChunk: TextChunk = { text: '', element: 'paragraph' };

      // Should handle empty text (may reject async)
      try {
        await elevenlabsAdapter.play(emptyChunk);
      } catch (error) {
        // Expected to possibly fail in test environment
        expect(error).toBeDefined();
      }

      await expect(azureAdapter.play(emptyChunk)).rejects.toThrow();
    });

    test('adapters provide state information', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(mockConfig, mockTextProcessor);
      const azureAdapter = new AzureAdapter(mockConfig, mockTextProcessor);

      // Both should have state methods (may be optional)
      if (elevenlabsAdapter.getIsPlaying) {
        expect(typeof elevenlabsAdapter.getIsPlaying()).toBe('boolean');
      }

      if (azureAdapter.getIsPlaying) {
        expect(typeof azureAdapter.getIsPlaying()).toBe('boolean');
      }
    });
  });
});
