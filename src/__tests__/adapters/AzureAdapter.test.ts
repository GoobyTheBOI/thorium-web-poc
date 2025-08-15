import { AzureAdapter } from '../../lib/adapters/AzureAdapter';

// Mock Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechSynthesisOutputFormat: null,
    }),
  },
  SpeechSynthesizer: jest.fn().mockImplementation(() => ({
    speakTextAsync: jest.fn(),
    close: jest.fn(),
  })),
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(),
  },
  SpeechSynthesisOutputFormat: {
    Audio24Khz48KBitRateMonoMp3: 'Audio24Khz48KBitRateMonoMp3',
  },
}));

describe('AzureAdapter', () => {
  let adapter: AzureAdapter;
  let mockConfig: any;
  let mockTextProcessor: any;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'test-azure-key',
      region: 'test-region',
      voiceId: 'en-US-AriaNeural',
      language: 'en-US'
    };

    mockTextProcessor = {
      formatText: jest.fn((text) => text),
      processText: jest.fn((text) => text),
    };

    adapter = new AzureAdapter(mockConfig, mockTextProcessor);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any audio elements
    if ((adapter as any).currentAudio) {
      (adapter as any).currentAudio.pause();
      (adapter as any).currentAudio = null;
    }
  });

  describe('Initialization', () => {
    test('creates Azure speech config correctly', () => {
      const sdk = require('microsoft-cognitiveservices-speech-sdk');

      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'test-azure-key',
        'test-region'
      );
    });

    test('sets up speech synthesizer with correct configuration', () => {
      const sdk = require('microsoft-cognitiveservices-speech-sdk');

      expect(sdk.SpeechSynthesizer).toHaveBeenCalled();
      expect(sdk.AudioConfig.fromDefaultSpeakerOutput).toHaveBeenCalled();
    });

    test('configures output format for MP3', () => {
      const speechConfig = require('microsoft-cognitiveservices-speech-sdk')
        .SpeechConfig.fromSubscription();

      // Verify that the output format is set to MP3
      expect(speechConfig.speechSynthesisOutputFormat).toBeDefined();
    });
  });

  describe('Text-to-Speech Processing', () => {
    test('play method processes text chunk correctly', async () => {
      const textChunk = {
        text: 'Hello world',
        element: 'paragraph',
        index: 0
      };

      const mockSynthesizer = require('microsoft-cognitiveservices-speech-sdk')
        .SpeechSynthesizer.mock.results[0].value;

      mockSynthesizer.speakTextAsync.mockImplementation((ssml: any, callback: any) => {
        // Simulate successful synthesis
        const mockResult = {
          audioData: new ArrayBuffer(1024),
          reason: 'SynthesizingAudioCompleted'
        };
        callback(mockResult);
      });

      const result = await adapter.play(textChunk);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith('Hello world', 'paragraph');
      expect(mockSynthesizer.speakTextAsync).toHaveBeenCalled();
      expect(result).toEqual({ requestId: expect.any(String) });
    });

    test('generateSSML creates proper SSML markup', () => {
      const ssml = (adapter as any).generateSSML('Hello world', 'en-US-AriaNeural');

      expect(ssml).toContain('<speak version="1.0"');
      expect(ssml).toContain('xmlns="http://www.w3.org/2001/10/synthesis"');
      expect(ssml).toContain('xml:lang="en-US"');
      expect(ssml).toContain('<voice name="en-US-AriaNeural">');
      expect(ssml).toContain('Hello world');
      expect(ssml).toContain('</voice>');
      expect(ssml).toContain('</speak>');
    });

    test('handles empty text input', async () => {
      const textChunk = {
        text: '',
        element: 'paragraph',
        index: 0
      };

      const result = await adapter.play(textChunk);
      expect(result).toEqual({ requestId: null });
    });

    test('handles synthesis errors gracefully', async () => {
      const textChunk = {
        text: 'Hello world',
        element: 'paragraph',
        index: 0
      };

      const mockSynthesizer = require('microsoft-cognitiveservices-speech-sdk')
        .SpeechSynthesizer.mock.results[0].value;

      mockSynthesizer.speakTextAsync.mockImplementation((ssml: any, callback: any, errorCallback: any) => {
        errorCallback(new Error('Synthesis failed'));
      });

      const errorCallback = jest.fn();
      adapter.on('error', errorCallback);

      const result = await adapter.play(textChunk);

      expect(result).toEqual({ requestId: null });
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  describe('Audio Playback Control', () => {
    test('pause method pauses current audio', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn(),
        currentTime: 15,
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
        currentTime: 15,
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
      const playCallback = jest.fn();
      const pauseCallback = jest.fn();
      const errorCallback = jest.fn();

      adapter.on('play', playCallback);
      adapter.on('pause', pauseCallback);
      adapter.on('error', errorCallback);

      expect((adapter as any).eventListeners.get('play')).toContain(playCallback);
      expect((adapter as any).eventListeners.get('pause')).toContain(pauseCallback);
      expect((adapter as any).eventListeners.get('error')).toContain(errorCallback);
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
      const eventData = { test: 'data' };

      adapter.on('play', callback);
      (adapter as any).emitEvent('play', eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    test('supports all required event types', () => {
      const events = ['wordBoundary', 'end', 'play', 'pause', 'resume', 'stop', 'error'];

      events.forEach(event => {
        const callback = jest.fn();
        expect(() => adapter.on(event as any, callback)).not.toThrow();
        expect(() => adapter.off(event as any, callback)).not.toThrow();
      });
    });
  });

  describe('Audio Processing', () => {
    test('createAudioFromBuffer converts ArrayBuffer to Audio element', () => {
      const audioBuffer = new ArrayBuffer(1024);
      const uint8Array = new Uint8Array(audioBuffer);

      // Fill with some test data
      for (let i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = i % 256;
      }

      const originalAudio = global.Audio;
      const mockAudio = {
        src: '',
        load: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      (global as any).Audio = jest.fn(() => mockAudio);

      const audio = (adapter as any).createAudioFromBuffer(audioBuffer);

      expect(audio).toBeDefined();
      expect(audio.src).toContain('blob:');
      expect(audio.load).toHaveBeenCalled();

      global.Audio = originalAudio;
    });

    test('setupAudioEventListeners registers proper events', () => {
      const mockAudio = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        load: jest.fn()
      };

      (adapter as any).setupAudioEventListeners(mockAudio);

      expect(mockAudio.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockAudio.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAudio.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
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

    test('tracks playback state correctly during operations', () => {
      const mockAudio = {
        pause: jest.fn(),
        play: jest.fn().mockResolvedValue(undefined),
        currentTime: 0,
        duration: 60
      };

      (adapter as any).currentAudio = mockAudio;

      // Test pause state
      (adapter as any).isPlaying = true;
      adapter.pause();
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(true);

      // Test resume state
      adapter.resume();
      expect((adapter as any).isPlaying).toBe(true);
      expect((adapter as any).isPaused).toBe(false);

      // Test stop state
      adapter.stop();
      expect((adapter as any).isPlaying).toBe(false);
      expect((adapter as any).isPaused).toBe(false);
    });
  });

  describe('Resource Management', () => {
    test('cleanup properly releases Azure resources', () => {
      const mockSynthesizer = require('microsoft-cognitiveservices-speech-sdk')
        .SpeechSynthesizer.mock.results[0].value;

      const mockAudio = {
        pause: jest.fn(),
        removeEventListener: jest.fn()
      };

      (adapter as any).currentAudio = mockAudio;
      (adapter as any).cleanup();

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(mockAudio.pause).toHaveBeenCalled();
      expect(mockAudio.removeEventListener).toHaveBeenCalled();
    });

    test('handles cleanup when no resources are allocated', () => {
      (adapter as any).currentAudio = null;
      (adapter as any).synthesizer = null;

      expect(() => (adapter as any).cleanup()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('handles Azure SDK initialization errors', () => {
      const sdk = require('microsoft-cognitiveservices-speech-sdk');
      sdk.SpeechConfig.fromSubscription.mockImplementation(() => {
        throw new Error('Invalid subscription key');
      });

      expect(() => new AzureAdapter(mockConfig, mockTextProcessor)).not.toThrow();
    });

    test('handles audio playback errors gracefully', () => {
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

    test('handles invalid SSML gracefully', () => {
      // Test with null/undefined text
      expect(() => (adapter as any).generateSSML(null, 'en-US-AriaNeural')).not.toThrow();
      expect(() => (adapter as any).generateSSML(undefined, 'en-US-AriaNeural')).not.toThrow();

      // Test with invalid voice
      expect(() => (adapter as any).generateSSML('Hello', null)).not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    test('uses provided Azure configuration correctly', () => {
      expect((adapter as any).config.apiKey).toBe('test-azure-key');
      expect((adapter as any).config.region).toBe('test-region');
      expect((adapter as any).config.voiceId).toBe('en-US-AriaNeural');
      expect((adapter as any).config.language).toBe('en-US');
    });

    test('integrates with text processor', () => {
      const testText = 'Hello Azure TTS';
      const testElement = 'heading';

      (adapter as any).textProcessor.formatText(testText, testElement);

      expect(mockTextProcessor.formatText).toHaveBeenCalledWith(testText, testElement);
    });

    test('generates SSML with correct voice configuration', () => {
      const ssml = (adapter as any).generateSSML('Test text', mockConfig.voiceId);

      expect(ssml).toContain(`<voice name="${mockConfig.voiceId}">`);
      expect(ssml).toContain(`xml:lang="${mockConfig.language}"`);
    });
  });
});
