import { createAdapter, AdapterType, AVAILABLE_ADAPTERS } from '../../lib/factories/AdapterFactory';
import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../../lib/adapters/AzureAdapter';
import { DefaultTextProcessor } from '../../lib/TextProcessor';
import { VoiceManagementService } from '../../lib/services/VoiceManagementService';

jest.mock('../../lib/adapters/ElevenLabsAdapter');
jest.mock('../../lib/adapters/AzureAdapter');

describe('TTSAdapterFactory', () => {
  let voiceManagementService: VoiceManagementService;

  beforeEach(() => {
    voiceManagementService = new VoiceManagementService();
    jest.clearAllMocks();

    // Reset mock implementations to return proper constructor instances
    (ElevenLabsAdapter as jest.Mock).mockImplementation(function(textProcessor, voiceService) {
      const instance = Object.create(ElevenLabsAdapter.prototype);
      instance.textProcessor = textProcessor;
      instance.voiceManagementService = voiceService;
      instance.play = jest.fn();
      instance.pause = jest.fn();
      instance.resume = jest.fn();
      instance.stop = jest.fn();
      instance.destroy = jest.fn();
      instance.on = jest.fn();
      instance.off = jest.fn();
      instance.emitEvent = jest.fn();
      instance.updatePlaybackState = jest.fn();
      return instance;
    });

    (AzureAdapter as jest.Mock).mockImplementation(function(textProcessor, voiceService) {
      const instance = Object.create(AzureAdapter.prototype);
      instance.textProcessor = textProcessor;
      instance.voiceManagementService = voiceService;
      instance.play = jest.fn();
      instance.pause = jest.fn();
      instance.resume = jest.fn();
      instance.stop = jest.fn();
      instance.destroy = jest.fn();
      instance.on = jest.fn();
      instance.off = jest.fn();
      instance.emitEvent = jest.fn();
      instance.updatePlaybackState = jest.fn();
      return instance;
    });
  });

  describe('createAdapter function', () => {
    test('creates ElevenLabsAdapter for elevenlabs type', () => {
      const adapter = createAdapter('elevenlabs', voiceManagementService);
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(1);
    });

    test('creates AzureAdapter for azure type', () => {
      const adapter = createAdapter('azure', voiceManagementService);
      expect(adapter).toBeInstanceOf(AzureAdapter);
      expect(AzureAdapter).toHaveBeenCalledTimes(1);
    });

    test('throws error for unsupported adapter type', () => {
      expect(() => createAdapter('invalid' as AdapterType, voiceManagementService))
        .toThrow('Unknown adapter type: invalid');
    });

    test('creates adapters with proper dependency injection', () => {
      createAdapter('elevenlabs', voiceManagementService);
      
      expect(ElevenLabsAdapter).toHaveBeenCalledWith(
        expect.any(DefaultTextProcessor),
        voiceManagementService
      );
    });
  });

  describe('AVAILABLE_ADAPTERS export', () => {
    test('returns all adapter options', () => {
      const options = AVAILABLE_ADAPTERS;
      expect(options.length).toBeGreaterThan(0);
      expect(options.some((opt: any) => opt.key === 'elevenlabs')).toBe(true);
      expect(options.some((opt: any) => opt.key === 'azure')).toBe(true);
    });

    test('adapter options have correct structure', () => {
      const options = AVAILABLE_ADAPTERS;
      options.forEach(option => {
        expect(option).toHaveProperty('key');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('isImplemented');
        expect(typeof option.key).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.isImplemented).toBe('boolean');
      });
    });
  });

  describe('Type Safety', () => {
    test('AdapterType union restricts to valid types', () => {
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];
      validTypes.forEach(type => {
        expect(() => createAdapter(type, voiceManagementService)).not.toThrow();
      });
    });

    test('created adapters implement consistent interfaces', () => {
      const elevenlabsAdapter = createAdapter('elevenlabs', voiceManagementService);
      const azureAdapter = createAdapter('azure', voiceManagementService);

      // Both should have the same interface methods
      expect(elevenlabsAdapter.play).toBeDefined();
      expect(elevenlabsAdapter.pause).toBeDefined();
      expect(elevenlabsAdapter.resume).toBeDefined();
      expect(elevenlabsAdapter.stop).toBeDefined();

      expect(azureAdapter.play).toBeDefined();
      expect(azureAdapter.pause).toBeDefined();
      expect(azureAdapter.resume).toBeDefined();
      expect(azureAdapter.stop).toBeDefined();
    });
  });
});