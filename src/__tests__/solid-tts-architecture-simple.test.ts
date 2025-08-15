import { TTSAdapterFactory } from '../lib/AdapterFactory';
import { ElevenLabsAdapter } from '../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../lib/adapters/AzureAdapter';
import { TtsOrchestrationService } from '../lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '../lib/services/TextExtractionService';
import { VoiceManagementService } from '../lib/services/VoiceManagementService';
import { KeyboardShortcutService } from '../lib/services/KeyboardShortcutService';

// Mock external dependencies
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsApi: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convertAsStream: jest.fn(),
    },
  })),
}));

jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn(),
  },
  SpeechSynthesizer: jest.fn(),
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(),
  },
}));

// Mock readium-speech
jest.mock('readium-speech', () => ({
  getVoices: jest.fn().mockResolvedValue([
    { name: 'Test Voice', label: 'Test Voice', language: 'en-US', voiceURI: 'test-voice' }
  ]),
}));

describe('SOLID TTS Architecture Tests', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    test('EpubTextExtractionService only handles text processing', () => {
      const textService = new EpubTextExtractionService();

      // Should only have text-related methods
      expect(typeof textService.extractTextChunks).toBe('function');
      expect(typeof textService.getCurrentReaderElement).toBe('function');

      // Should not have audio or voice methods (check prototype doesn't have these)
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(textService));
      expect(methods.includes('playAudio')).toBe(false);
      expect(methods.includes('loadVoices')).toBe(false);
    });

    test('VoiceManagementService only handles voice operations', () => {
      const voiceService = new VoiceManagementService();

      // Should only have voice-related methods
      expect(typeof voiceService.getSelectedVoice).toBe('function');
      expect(typeof voiceService.loadVoices).toBe('function');
      expect(typeof voiceService.selectVoice).toBe('function');

      // Should not have text or audio methods
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(voiceService));
      expect(methods.includes('extractTextChunks')).toBe(false);
      expect(methods.includes('playAudio')).toBe(false);
    });

    test('KeyboardShortcutService only handles keyboard events', () => {
      const keyboardService = new KeyboardShortcutService();

      // Should only have keyboard-related methods
      expect(typeof keyboardService.registerShortcuts).toBe('function');
      expect(typeof keyboardService.unregisterShortcuts).toBe('function');

      // Should not have TTS implementation methods
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(keyboardService));
      expect(methods.includes('generateSpeech')).toBe(false);
      expect(methods.includes('extractTextChunks')).toBe(false);
    });

    test('TtsOrchestrationService coordinates without implementing specifics', () => {
      // Create mock adapter with required methods
      const mockAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      const mockTextService = {
        extractTextChunks: jest.fn(),
        getCurrentReaderElement: jest.fn(),
      };

      const orchestrationService = new TtsOrchestrationService(
        mockAdapter as any,
        mockTextService as any
      );

      // Verify service only has coordination methods
      expect(typeof orchestrationService.startReading).toBe('function');
      expect(typeof orchestrationService.pauseReading).toBe('function');
      expect(typeof orchestrationService.stopReading).toBe('function');

      // Should not have implementation details of other services
      expect(orchestrationService.hasOwnProperty('extractText')).toBe(false);
      expect(orchestrationService.hasOwnProperty('synthesizeSpeech')).toBe(false);
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    test('TTSAdapterFactory supports extension without modification', () => {
      const factory = new TTSAdapterFactory();

      // Test that factory can create different adapter types
      const mockConfig = { apiKey: 'test-key', voiceId: 'test-voice' };

      expect(() => factory.createAdapter('elevenlabs', mockConfig)).not.toThrow();
      expect(() => factory.createAdapter('azure', mockConfig)).not.toThrow();
    });

    test('Factory provides extensible adapter options', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);

      // Each option should have the structure for adding new adapters
      options.forEach((option: any) => {
        expect(option).toHaveProperty('key');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('isImplemented');
      });
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    test('Adapters are interchangeable', () => {
      const factory = new TTSAdapterFactory();
      const mockConfig = { apiKey: 'test-key', voiceId: 'test-voice' };

      const elevenlabsAdapter = factory.createAdapter('elevenlabs', mockConfig);
      const azureAdapter = factory.createAdapter('azure', mockConfig);

      // Both adapters should be instances of their respective classes
      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);

      // Both should have the same interface methods
      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });

    test('TtsOrchestrationService works with any adapter', () => {
      const factory = new TTSAdapterFactory();
      const mockConfig = { apiKey: 'test-key', voiceId: 'test-voice' };

      const mockTextService = {
        extractTextChunks: jest.fn(),
        getCurrentReaderElement: jest.fn(),
      };

      const elevenlabsAdapter = factory.createAdapter('elevenlabs', mockConfig);
      const azureAdapter = factory.createAdapter('azure', mockConfig);

      // Should be able to create orchestration service with either adapter
      expect(() => new TtsOrchestrationService(
        elevenlabsAdapter, mockTextService as any
      )).not.toThrow();

      expect(() => new TtsOrchestrationService(
        azureAdapter, mockTextService as any
      )).not.toThrow();
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    test('Services have focused interfaces', () => {
      const textService = new EpubTextExtractionService();
      const voiceService = new VoiceManagementService();
      const keyboardService = new KeyboardShortcutService();

      // Text service should only expose text-related methods
      expect(typeof textService.extractTextChunks).toBe('function');
      expect(typeof textService.getCurrentReaderElement).toBe('function');

      // Voice service should only expose voice-related methods
      expect(typeof voiceService.getSelectedVoice).toBe('function');
      expect(typeof voiceService.loadVoices).toBe('function');
      expect(typeof voiceService.selectVoice).toBe('function');

      // Keyboard service should only expose keyboard-related methods
      expect(typeof keyboardService.registerShortcuts).toBe('function');
      expect(typeof keyboardService.unregisterShortcuts).toBe('function');
    });

    test('Services depend only on methods they use', () => {
      // Mock adapter with extra methods that orchestration service shouldn't need
      const mockAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        // Additional methods that orchestration service shouldn't need
        someInternalMethod: jest.fn(),
        anotherUnusedMethod: jest.fn(),
      };

      const mockTextService = {
        extractTextChunks: jest.fn(),
        getCurrentReaderElement: jest.fn(),
      };

      // Should work even if adapter has extra methods
      expect(() => new TtsOrchestrationService(
        mockAdapter as any, mockTextService as any
      )).not.toThrow();
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    test('TtsOrchestrationService depends on abstractions', () => {
      // Should accept any object that implements the required interface
      const mockTextService = {
        extractTextChunks: jest.fn(),
        getCurrentReaderElement: jest.fn(),
      };

      const mockAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      // Should work with mock implementations
      expect(() => new TtsOrchestrationService(
        mockAdapter, mockTextService
      )).not.toThrow();
    });

    test('Factory creates adapters without tight coupling', () => {
      const factory = new TTSAdapterFactory();
      const mockConfig = { apiKey: 'test-key', voiceId: 'test-voice' };

      const elevenlabsAdapter = factory.createAdapter('elevenlabs', mockConfig);
      const azureAdapter = factory.createAdapter('azure', mockConfig);

      // Factory returns interface-compliant objects
      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();

      // Both should have the same interface methods
      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });
  });

  describe('Factory Pattern Implementation', () => {
    test('Factory creates correct adapter instances', () => {
      const factory = new TTSAdapterFactory();
      const mockConfig = { apiKey: 'test-key', voiceId: 'test-voice' };

      const elevenlabsAdapter = factory.createAdapter('elevenlabs', mockConfig);
      const azureAdapter = factory.createAdapter('azure', mockConfig);

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });

    test('Factory provides available adapter options', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);

      // Should include both implemented adapters
      const adapterKeys = options.map((opt: any) => opt.key);
      expect(adapterKeys).toContain('elevenlabs');
      expect(adapterKeys).toContain('azure');
    });

    test('Factory handles configuration correctly', () => {
      const factory = new TTSAdapterFactory();
      const config = {
        apiKey: 'test-key',
        voiceId: 'test-voice',
        region: 'test-region'
      };

      // Should create adapters with provided configuration
      expect(() => factory.createAdapter('elevenlabs', config)).not.toThrow();
      expect(() => factory.createAdapter('azure', config)).not.toThrow();
    });
  });

  describe('Error Handling and Robustness', () => {
    test('Services handle errors gracefully', () => {
      const textService = new EpubTextExtractionService();

      // Should handle operations without crashing
      expect(() => textService.getCurrentReaderElement()).not.toThrow();
    });

    test('Factory handles invalid adapter types', () => {
      const factory = new TTSAdapterFactory();
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };

      // Should throw for unimplemented adapter types
      expect(() => factory.createAdapter('web-speech', config))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('OrchestrationService validates state before operations', () => {
      const mockTextService = {
        extractTextChunks: jest.fn(),
        getCurrentReaderElement: jest.fn(),
      };

      const mockAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };

      const orchestrationService = new TtsOrchestrationService(
        mockAdapter as any, mockTextService as any
      );

      // Should handle operations without crashing
      expect(() => orchestrationService.pauseReading()).not.toThrow();
      expect(() => orchestrationService.stopReading()).not.toThrow();
    });
  });
});
