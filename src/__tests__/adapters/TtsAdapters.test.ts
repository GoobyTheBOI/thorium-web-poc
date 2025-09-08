import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../../lib/adapters/AzureAdapter';
import { DefaultTextProcessor } from '../../lib/TextProcessor';
import type { ITextProcessor } from '../../preferences/types';
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

jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechSynthesisVoiceName: 'en-US-Adam:DragonHDLatestNeural',
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

describe('TTS Adapters - SOLID Architecture', () => {
  let textProcessor: ITextProcessor;

  beforeEach(() => {
    textProcessor = new DefaultTextProcessor();
  });

  describe('ElevenLabsAdapter', () => {
    let adapter: ElevenLabsAdapter;

    beforeEach(() => {
      adapter = new ElevenLabsAdapter(textProcessor);
    });

    test('should create adapter instance with correct dependencies', () => {
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
    });

    test('should implement IPlaybackAdapter interface', () => {
      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.resume).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.destroy).toBe('function');
      expect(typeof adapter.on).toBe('function');
      expect(typeof adapter.off).toBe('function');
    });

    test('should handle play method with TextChunk', async () => {
      const testChunk: TextChunk = {
        text: 'Hello, world!',
        element: 'paragraph'
      };

      // Should process text through TextProcessor
      const formatTextSpy = jest.spyOn(textProcessor, 'formatText');

      try {
        await adapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment due to missing API keys
        expect(error).toBeDefined();
      }

      expect(formatTextSpy).toHaveBeenCalledWith('Hello, world!', 'paragraph');
    });

    test('should handle control methods without throwing', () => {
      expect(() => adapter.pause()).not.toThrow();
      expect(() => adapter.resume()).not.toThrow();
      expect(() => adapter.stop()).not.toThrow();
      expect(() => adapter.destroy()).not.toThrow();
    });

    test('should handle event system correctly', () => {
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

    test('should provide state information methods', () => {
      if (adapter.getIsPlaying) {
        expect(typeof adapter.getIsPlaying()).toBe('boolean');
      }
      if (adapter.getIsPaused) {
        expect(typeof adapter.getIsPaused()).toBe('boolean');
      }
    });
  });

  describe('AzureAdapter', () => {
    let adapter: AzureAdapter;

    beforeEach(() => {
      adapter = new AzureAdapter(textProcessor);
    });

    test('should create adapter instance with correct dependencies', () => {
      expect(adapter).toBeInstanceOf(AzureAdapter);
    });

    test('should implement IPlaybackAdapter interface', () => {
      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.resume).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.destroy).toBe('function');
      expect(typeof adapter.on).toBe('function');
      expect(typeof adapter.off).toBe('function');
    });

    test('should handle play method with TextChunk', async () => {
      const testChunk: TextChunk = {
        text: 'Hello from Azure!',
        element: 'paragraph'
      };

      // Should process text through TextProcessor
      const formatTextSpy = jest.spyOn(textProcessor, 'formatText');

      try {
        await adapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment due to missing API keys
        expect(error).toBeDefined();
      }

      expect(formatTextSpy).toHaveBeenCalledWith('Hello from Azure!', 'paragraph');
    });

    test('should handle control methods without throwing', () => {
      expect(() => adapter.pause()).not.toThrow();
      expect(() => adapter.resume()).not.toThrow();
      expect(() => adapter.stop()).not.toThrow();
      expect(() => adapter.destroy()).not.toThrow();
    });

    test('should handle event system correctly', () => {
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

    test('should provide state information methods', () => {
      if (adapter.getIsPlaying) {
        expect(typeof adapter.getIsPlaying()).toBe('boolean');
      }
      if (adapter.getIsPaused) {
        expect(typeof adapter.getIsPaused()).toBe('boolean');
      }
    });
  });

  describe('Adapter Interface Compliance', () => {
    test('both adapters implement the same IPlaybackAdapter interface', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });

    test('adapters use dependency injection correctly', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();
    });

    test('adapters handle text processing consistently', async () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      const testChunk: TextChunk = {
        text: 'Test speech text',
        element: 'paragraph'
      };

      const formatTextSpy = jest.spyOn(textProcessor, 'formatText');

      // Both adapters should call formatText
      try {
        await elevenlabsAdapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment
      }

      try {
        await azureAdapter.play(testChunk);
      } catch (error) {
        // Expected to possibly fail in test environment
      }

      expect(formatTextSpy).toHaveBeenCalledTimes(2);
      expect(formatTextSpy).toHaveBeenCalledWith('Test speech text', 'paragraph');
    });

    test('adapters follow Single Responsibility Principle', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      // Adapters should only handle playback, not text processing
      expect(elevenlabsAdapter).not.toHaveProperty('formatText');
      expect(azureAdapter).not.toHaveProperty('formatText');

      // Text processing is delegated to injected processor
      expect(textProcessor.formatText).toBeDefined();
      expect(textProcessor.validateText).toBeDefined();
    });
  });

  describe('Error Handling and Validation', () => {
    test('adapters handle empty text input gracefully', async () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      const emptyChunk: TextChunk = { text: '', element: 'paragraph' };

      // Text processor should handle empty text
      const formatTextResult = textProcessor.formatText('', 'paragraph');
      expect(typeof formatTextResult).toBe('string');

      // Adapters should handle the result
      try {
        await elevenlabsAdapter.play(emptyChunk);
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        await azureAdapter.play(emptyChunk);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('adapters maintain proper state after operations', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      // Test lifecycle methods
      expect(() => {
        elevenlabsAdapter.pause();
        elevenlabsAdapter.resume();
        elevenlabsAdapter.stop();
        elevenlabsAdapter.destroy();
      }).not.toThrow();

      expect(() => {
        azureAdapter.pause();
        azureAdapter.resume();
        azureAdapter.stop();
        azureAdapter.destroy();
      }).not.toThrow();
    });

    test('adapters handle invalid event listeners gracefully', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      const mockCallback = jest.fn();

      // Should handle invalid event types gracefully
      expect(() => {
        (elevenlabsAdapter as any).on('invalidEvent', mockCallback);
        (azureAdapter as any).on('invalidEvent', mockCallback);
      }).not.toThrow();

      expect(() => {
        (elevenlabsAdapter as any).off('invalidEvent', mockCallback);
        (azureAdapter as any).off('invalidEvent', mockCallback);
      }).not.toThrow();
    });
  });

  describe('SOLID Principles Compliance', () => {
    test('Single Responsibility: Adapters only handle TTS playback', () => {
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);

      // Should not have text processing methods
      expect(elevenlabsAdapter).not.toHaveProperty('formatText');
      expect(elevenlabsAdapter).not.toHaveProperty('validateText');

      // Should have only playback methods
      expect(elevenlabsAdapter).toHaveProperty('play');
      expect(elevenlabsAdapter).toHaveProperty('pause');
      expect(elevenlabsAdapter).toHaveProperty('resume');
      expect(elevenlabsAdapter).toHaveProperty('stop');
    });

    test('Dependency Inversion: Adapters depend on abstractions', () => {
      // Adapters depend on ITextProcessor interface, not concrete implementation
      const customProcessor: ITextProcessor = {
        formatText: jest.fn(() => 'formatted'),
        validateText: jest.fn(() => true)
      };

      expect(() => new ElevenLabsAdapter(customProcessor)).not.toThrow();
      expect(() => new AzureAdapter(customProcessor)).not.toThrow();
    });

    test('Open/Closed: Adapters can be extended without modification', () => {
      // Both adapters implement the same interface
      const elevenlabsAdapter = new ElevenLabsAdapter(textProcessor);
      const azureAdapter = new AzureAdapter(textProcessor);

      // Should be possible to use them interchangeably
      const adapters = [elevenlabsAdapter, azureAdapter];

      adapters.forEach(adapter => {
        expect(typeof adapter.play).toBe('function');
        expect(typeof adapter.stop).toBe('function');
      });
    });

    test('Interface Segregation: Clean interfaces without unnecessary methods', () => {
      const adapter = new ElevenLabsAdapter(textProcessor);

      // Should only have public methods defined in interfaces
      const expectedMethods = [
        'play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off',
        'getIsPlaying', 'getIsPaused', 'getCurrentAudio'
      ];

      // Private/internal methods that shouldn't be part of the public interface
      const privateMethodNames = [
        'validateAndFormatText', 'executePlayRequest', 'makeApiRequest',
        'processApiResponse', 'setupAudioPlayback', 'updatePlaybackState',
        'emitEvent', 'createError', 'setupAudioEvents', 'cleanup',
        // Voice methods are private and only accessible through voices property
        'getVoices', 'setVoice', 'getVoicesByGender', 'getCurrentVoiceGender'
      ];

      // Get only public methods (exclude constructor and private implementation methods)
      const adapterMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(adapter))
        .filter(name => {
          if (name === 'constructor') return false;
          if (typeof (adapter as any)[name] !== 'function') return false;
          if (privateMethodNames.includes(name)) return false;
          return true;
        });

      // Verify that all public methods are expected interface methods
      const unexpectedMethods = adapterMethods.filter(method =>
        !expectedMethods.includes(method) && !method.startsWith('get')
      );

      expect(unexpectedMethods).toEqual([]);
    });
  });
});
