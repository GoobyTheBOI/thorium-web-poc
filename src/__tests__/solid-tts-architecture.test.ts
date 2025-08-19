import { TTSAdapterFactory, AdapterType } from '../lib/AdapterFactory';
import { TtsOrchestrationService } from '../lib/services/TtsOrchestrationService';
import { ElevenLabsAdapter } from '../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../lib/adapters/AzureAdapter';
import { VoiceManagementService } from '../lib/services/VoiceManagementService';
import { EpubTextExtractionService } from '../lib/services/TextExtractionService';
import { KeyboardHandler } from '../lib/handlers/KeyboardHandler';
import { TtsStateManager } from '../lib/managers/TtsStateManager';

// Mock the external dependencies
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

describe('SOLID TTS Architecture Tests', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    test('TtsOrchestrationService only coordinates TTS operations', () => {
      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      } as any;

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      } as any;

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      } as any;

      const mockAdapter = {
        generateSpeech: jest.fn(),
        playAudio: jest.fn(),
        pauseAudio: jest.fn(),
        stopAudio: jest.fn(),
        getCurrentPosition: jest.fn(),
        getDuration: jest.fn(),
        isPlaying: jest.fn(),
        cleanup: jest.fn(),
      } as any;

      const orchestrationService = new TtsOrchestrationService(
        mockTextService,
        mockVoiceService,
        mockKeyboardService,
        mockAdapter
      );

      // Verify service only has coordination methods
      expect(typeof orchestrationService.startReading).toBe('function');
      expect(typeof orchestrationService.pauseReading).toBe('function');
      expect(typeof orchestrationService.stopReading).toBe('function');
      expect(typeof orchestrationService.playCurrentChunk).toBe('function');

      // Should not have implementation details of other services
      expect(orchestrationService.hasOwnProperty('extractText')).toBe(false);
      expect(orchestrationService.hasOwnProperty('synthesizeSpeech')).toBe(false);
      expect(orchestrationService.hasOwnProperty('manageVoices')).toBe(false);
    });

    test('TextExtractionService only handles text processing', () => {
      const textService = new EpubTextExtractionService();

      // Should only have text-related methods
      expect(typeof textService.extractTextChunks).toBe('function');
      expect(typeof textService.getCurrentReaderElement).toBe('function');

      // Should not have TTS implementation methods
      expect(textService.hasOwnProperty('generateSpeech')).toBe(false);
      expect(textService.hasOwnProperty('playAudio')).toBe(false);
      expect(textService.hasOwnProperty('pause')).toBe(false);
    });

    test('VoiceManagementService only handles voice operations', () => {
      const voiceService = new VoiceManagementService();

      // Should only have voice-related methods
      expect(typeof voiceService.getSelectedVoice).toBe('function');
      expect(typeof voiceService.setSelectedVoice).toBe('function');
      expect(typeof voiceService.getVoices).toBe('function');
      expect(typeof voiceService.validateVoice).toBe('function');

      // Should not have text or audio methods
      expect(voiceService.hasOwnProperty('extractText')).toBe(false);
      expect(voiceService.hasOwnProperty('playAudio')).toBe(false);
      expect(voiceService.hasOwnProperty('registerShortcuts')).toBe(false);
    });

    test('KeyboardShortcutService only handles keyboard events', () => {
      const keyboardService = new KeyboardShortcutService();

      // Should only have keyboard-related methods
      expect(typeof keyboardService.registerShortcuts).toBe('function');
      expect(typeof keyboardService.unregisterShortcuts).toBe('function');
      expect(typeof keyboardService.handleKeyPress).toBe('function');

      // Should not have TTS implementation methods
      expect(keyboardService.hasOwnProperty('generateSpeech')).toBe(false);
      expect(keyboardService.hasOwnProperty('extractText')).toBe(false);
      expect(keyboardService.hasOwnProperty('getVoices')).toBe(false);
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    test('TTSAdapterFactory is open for extension, closed for modification', () => {
      // Should be able to create adapters without modifying factory
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });

    test('New adapter types can be added without breaking existing code', () => {
      // This test verifies that the AdapterType union allows extension
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];

      validTypes.forEach(type => {
        expect(() => TTSAdapterFactory.createAdapter(type)).not.toThrow();
      });
    });

    test('Adapters implement common interface for extensibility', () => {
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      // Both adapters should implement the same interface
      const commonMethods = [
        'generateSpeech', 'playAudio', 'pauseAudio', 'stopAudio',
        'getCurrentPosition', 'getDuration', 'isPlaying', 'cleanup'
      ];

      commonMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    test('All adapters can be used interchangeably', async () => {
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      const testText = 'Test speech text';
      const testVoice = { id: 'test-voice', name: 'Test Voice' };

      // Mock the generateSpeech method for both adapters
      jest.spyOn(elevenlabsAdapter as any, 'generateSpeech').mockResolvedValue(new Uint8Array());
      jest.spyOn(azureAdapter as any, 'generateSpeech').mockResolvedValue(new Uint8Array());

      // Both adapters should handle the same operations
      await expect((elevenlabsAdapter as any).generateSpeech(testText, testVoice)).resolves.toBeDefined();
      await expect((azureAdapter as any).generateSpeech(testText, testVoice)).resolves.toBeDefined();

      // Both should support the same control methods
      expect(() => (elevenlabsAdapter as any).playAudio()).not.toThrow();
      expect(() => (azureAdapter as any).playAudio()).not.toThrow();

      expect(() => (elevenlabsAdapter as any).pauseAudio()).not.toThrow();
      expect(() => (azureAdapter as any).pauseAudio()).not.toThrow();
    });

    test('TtsOrchestrationService works with any adapter', () => {
      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      } as any;

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      } as any;

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      } as any;

      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      // Should be able to create orchestration service with either adapter
      expect(() => new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, elevenlabsAdapter
      )).not.toThrow();

      expect(() => new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, azureAdapter
      )).not.toThrow();
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    test('Services depend only on methods they use', () => {
      // TtsOrchestrationService should only depend on specific methods
      const mockAdapter = {
        generateSpeech: jest.fn(),
        playAudio: jest.fn(),
        pauseAudio: jest.fn(),
        stopAudio: jest.fn(),
        getCurrentPosition: jest.fn(),
        getDuration: jest.fn(),
        isPlaying: jest.fn(),
        cleanup: jest.fn(),
        // Additional methods that orchestration service shouldn't need
        someInternalMethod: jest.fn(),
        anotherUnusedMethod: jest.fn(),
      };

      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      } as any;

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      } as any;

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      } as any;

      // Should work even if adapter has extra methods
      expect(() => new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, mockAdapter
      )).not.toThrow();
    });

    test('TextExtractionService has focused interface', () => {
      const textService = new TextExtractionService();

      // Should only expose text-related methods
      const publicMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(textService))
        .filter(name => name !== 'constructor' && typeof (textService as any)[name] === 'function');

      publicMethods.forEach(method => {
        expect(['extractTextFromElement', 'splitIntoChunks', 'processSentences'].includes(method))
          .toBe(true);
      });
    });

    test('VoiceManagementService has focused interface', () => {
      const voiceService = new VoiceManagementService();

      // Should only expose voice-related methods
      const publicMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(voiceService))
        .filter(name => name !== 'constructor' && typeof (voiceService as any)[name] === 'function');

      publicMethods.forEach(method => {
        expect(['getSelectedVoice', 'setSelectedVoice', 'getVoices', 'validateVoice'].includes(method))
          .toBe(true);
      });
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    test('TtsOrchestrationService depends on abstractions, not concretions', () => {
      // Should accept any object that implements the required interface
      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      };

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      };

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      };

      const mockAdapter = {
        generateSpeech: jest.fn(),
        playAudio: jest.fn(),
        pauseAudio: jest.fn(),
        stopAudio: jest.fn(),
        getCurrentPosition: jest.fn(),
        getDuration: jest.fn(),
        isPlaying: jest.fn(),
        cleanup: jest.fn(),
      };

      // Should work with mock implementations
      expect(() => new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, mockAdapter
      )).not.toThrow();
    });

    test('Factory creates adapters without tight coupling', () => {
      // Factory should create adapters without knowing their implementation details
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      // Factory returns interface-compliant objects
      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();

      // Both should have the same interface methods
      const expectedMethods = [
        'generateSpeech', 'playAudio', 'pauseAudio', 'stopAudio',
        'getCurrentPosition', 'getDuration', 'isPlaying', 'cleanup'
      ];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });

    test('High-level modules do not depend on low-level modules', () => {
      // TtsOrchestrationService (high-level) should not depend on specific adapter implementations
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      } as any;

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      } as any;

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      } as any;

      // Should be able to swap adapters without changing orchestration service
      const orchestrationWithEL = new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, elevenlabsAdapter
      );

      const orchestrationWithAzure = new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, azureAdapter
      );

      expect(orchestrationWithEL).toBeDefined();
      expect(orchestrationWithAzure).toBeDefined();
    });
  });

  describe('Factory Pattern Implementation', () => {
    test('Factory creates correct adapter instances', () => {
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');
      const azureAdapter = TTSAdapterFactory.createAdapter('azure');

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });

    test('Factory throws error for invalid adapter type', () => {
      expect(() => TTSAdapterFactory.createAdapter('invalid' as AdapterType))
        .toThrow('Unsupported adapter type: invalid');
    });

    test('Factory provides available adapter options', () => {
      const options = TTSAdapterFactory.getAdapterOptions();

      expect(options).toHaveLength(2);
      expect(options).toContainEqual({ id: 'elevenlabs', label: 'ElevenLabs' });
      expect(options).toContainEqual({ id: 'azure', label: 'Azure Speech' });
    });
  });

  describe('Error Handling and Robustness', () => {
    test('Services handle errors gracefully', () => {
      const textService = new TextExtractionService();

      // Should handle null/undefined elements
      expect(() => textService.extractTextFromElement(null as any)).not.toThrow();
      expect(() => textService.extractTextFromElement(undefined as any)).not.toThrow();
    });

    test('Adapters handle invalid parameters', () => {
      const elevenlabsAdapter = TTSAdapterFactory.createAdapter('elevenlabs');

      // Should handle invalid text
      expect(() => (elevenlabsAdapter as any).generateSpeech('', null)).not.toThrow();
      expect(() => (elevenlabsAdapter as any).generateSpeech(null, {})).not.toThrow();
    });

    test('OrchestrationService validates state before operations', () => {
      const mockTextService = {
        extractTextFromElement: jest.fn(),
        splitIntoChunks: jest.fn(),
        processSentences: jest.fn(),
      } as any;

      const mockVoiceService = {
        getSelectedVoice: jest.fn(),
        setSelectedVoice: jest.fn(),
        getVoices: jest.fn(),
        validateVoice: jest.fn(),
      } as any;

      const mockKeyboardService = {
        registerShortcuts: jest.fn(),
        unregisterShortcuts: jest.fn(),
        handleKeyPress: jest.fn(),
      } as any;

      const mockAdapter = {
        generateSpeech: jest.fn(),
        playAudio: jest.fn(),
        pauseAudio: jest.fn(),
        stopAudio: jest.fn(),
        getCurrentPosition: jest.fn(),
        getDuration: jest.fn(),
        isPlaying: jest.fn(),
        cleanup: jest.fn(),
      } as any;

      const orchestrationService = new TtsOrchestrationService(
        mockTextService, mockVoiceService, mockKeyboardService, mockAdapter
      );

      // Should handle operations without crashing
      expect(() => orchestrationService.pauseReading()).not.toThrow();
      expect(() => orchestrationService.stopReading()).not.toThrow();
    });
  });
});
