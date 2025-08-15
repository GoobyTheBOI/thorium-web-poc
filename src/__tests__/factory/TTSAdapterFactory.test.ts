import { TTSAdapterFactory, AdapterType } from '../../lib/AdapterFactory';
import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../../lib/adapters/AzureAdapter';

// Mock the adapters
jest.mock('../../lib/adapters/ElevenLabsAdapter');
jest.mock('../../lib/adapters/AzureAdapter');

describe('TTSAdapterFactory', () => {
  let factory: TTSAdapterFactory;

  beforeEach(() => {
    factory = new TTSAdapterFactory();
    jest.clearAllMocks();
  });

  describe('Factory Pattern Implementation', () => {
    test('createAdapter creates ElevenLabsAdapter for elevenlabs type', () => {
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };
      const adapter = factory.createAdapter('elevenlabs', config);

      expect(ElevenLabsAdapter).toHaveBeenCalled();
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
    });

    test('createAdapter creates AzureAdapter for azure type', () => {
      const config = { apiKey: 'test-key', voiceId: 'test-voice', region: 'test-region' };
      const adapter = factory.createAdapter('azure', config);

      expect(AzureAdapter).toHaveBeenCalled();
      expect(adapter).toBeInstanceOf(AzureAdapter);
    });

    test('createAdapter throws error for unsupported adapter type', () => {
      const factory = new TTSAdapterFactory();
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };
      expect(() => factory.createAdapter('web-speech', config))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('createAdapter handles null/undefined input gracefully', () => {
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };
      expect(() => factory.createAdapter(null as any, config))
        .toThrow();

      expect(() => factory.createAdapter(undefined as any, config))
        .toThrow();
    });
  });

  describe('Static Adapter Options', () => {
    test('getAvailableAdapters returns all adapter options', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      expect(options).toHaveLength(3);
      expect(options.some(opt => opt.key === 'elevenlabs')).toBe(true);
      expect(options.some(opt => opt.key === 'azure')).toBe(true);
      expect(options.some(opt => opt.key === 'web-speech')).toBe(true);
    });

    test('getImplementedAdapters returns only implemented adapters', () => {
      const options = TTSAdapterFactory.getImplementedAdapters();

      expect(options).toHaveLength(2);
      expect(options.some(opt => opt.key === 'elevenlabs')).toBe(true);
      expect(options.some(opt => opt.key === 'azure')).toBe(true);
      expect(options.some(opt => opt.key === 'web-speech')).toBe(false);
    });

    test('adapter options have correct structure', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      options.forEach((option: any) => {
        expect(option).toHaveProperty('key');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('description');
        expect(option).toHaveProperty('isImplemented');
        expect(option).toHaveProperty('requiresApiKey');
        expect(typeof option.key).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.description).toBe('string');
        expect(typeof option.isImplemented).toBe('boolean');
        expect(typeof option.requiresApiKey).toBe('boolean');
      });
    });

    test('adapter options match AdapterType union', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();
      const validTypes: AdapterType[] = ['elevenlabs', 'azure', 'web-speech'];

      options.forEach((option: any) => {
        expect(validTypes).toContain(option.key as AdapterType);
      });
    });
  });

  describe('Type Safety', () => {
    test('AdapterType union restricts to valid types', () => {
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];

      validTypes.forEach(type => {
        expect(() => factory.createAdapter(type, config)).not.toThrow();
      });
    });

    test('adapter creation is type-safe', () => {
      const config = { apiKey: 'test-key', voiceId: 'test-voice' };
      const elevenlabsAdapter = factory.createAdapter('elevenlabs', config);
      const azureAdapter = factory.createAdapter('azure', config);

      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();
    });
  });

  describe('Configuration Handling', () => {
    test('adapters are created with provided configuration', () => {
      const config = {
        apiKey: 'test-key',
        voiceId: 'test-voice',
        modelId: 'test-model'
      };

      factory.createAdapter('elevenlabs', config);

      // Verify ElevenLabsAdapter was called with configuration parameters
      expect(ElevenLabsAdapter).toHaveBeenCalledWith(
        config,
        expect.any(Object)  // textProcessor
      );
    });

    test('azure adapter receives correct configuration', () => {
      const config = {
        apiKey: 'azure-key',
        region: 'test-region',
        voiceId: 'azure-voice'
      };

      factory.createAdapter('azure', config);

      // Verify AzureAdapter was called with configuration parameters
      expect(AzureAdapter).toHaveBeenCalledWith(
        config,
        expect.any(Object)  // textProcessor
      );
    });
  });

  describe('Extensibility', () => {
    test('factory supports adding new adapter types without breaking existing code', () => {
      const config = { apiKey: 'test-key' };
      // Test that existing adapters still work
      const elevenlabsAdapter = factory.createAdapter('elevenlabs', config);
      const azureAdapter = factory.createAdapter('azure', config);

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });

    test('factory maintains consistent interface across adapter types', () => {
      const config = { apiKey: 'test-key' };
      const elevenlabsAdapter = factory.createAdapter('elevenlabs', config);
      const azureAdapter = factory.createAdapter('azure', config);

      // Both adapters should be instances of their respective classes
      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);

      // Both should implement the same interface (verified by TypeScript compilation)
      expect(typeof (elevenlabsAdapter as any).play).toBe('function');
      expect(typeof (azureAdapter as any).play).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('factory provides clear error messages for unimplemented types', () => {
      const config = { apiKey: 'test-key' };

      expect(() => factory.createAdapter('web-speech', config))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('factory handles adapter instantiation errors gracefully', () => {
      const config = { apiKey: 'test-key' };
      // Mock ElevenLabsAdapter to throw an error during instantiation
      (ElevenLabsAdapter as jest.Mock).mockImplementation(() => {
        throw new Error('Adapter initialization failed');
      });

      expect(() => factory.createAdapter('elevenlabs', config))
        .toThrow('Adapter initialization failed');
    });
  });

  describe('Performance Considerations', () => {
    test('factory creates new instances for each call', () => {
      const config = { apiKey: 'test-key' };
      const adapter1 = factory.createAdapter('elevenlabs', config);
      const adapter2 = factory.createAdapter('elevenlabs', config);

      // Should be different instances
      expect(adapter1).not.toBe(adapter2);
      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
    });

    test('factory does not cache adapter instances', () => {
      const config = { apiKey: 'test-key' };
      // Create multiple adapters
      factory.createAdapter('elevenlabs', config);
      factory.createAdapter('azure', config);
      factory.createAdapter('elevenlabs', config);

      // Each call should create a new instance
      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
      expect(AzureAdapter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adapter Options Structure', () => {
    test('options contain human-readable labels', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      const elevenlabsOption = options.find(opt => opt.key === 'elevenlabs');
      const azureOption = options.find(opt => opt.key === 'azure');

      expect(elevenlabsOption?.name).toBe('ElevenLabs');
      expect(azureOption?.name).toBe('Microsoft Azure TTS');
    });

    test('options are suitable for UI display', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      options.forEach((option: any) => {
        // Names should be user-friendly (no underscores, proper casing)
        expect(option.name).not.toContain('_');
        expect(option.name.length).toBeGreaterThan(0);
        expect(option.name[0]).toEqual(option.name[0].toUpperCase());

        // Descriptions should be informative
        expect(option.description.length).toBeGreaterThan(10);
      });
    });

    test('options indicate implementation status correctly', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      const elevenlabsOption = options.find(opt => opt.key === 'elevenlabs');
      const azureOption = options.find(opt => opt.key === 'azure');
      const webSpeechOption = options.find(opt => opt.key === 'web-speech');

      expect(elevenlabsOption?.isImplemented).toBe(true);
      expect(azureOption?.isImplemented).toBe(true);
      expect(webSpeechOption?.isImplemented).toBe(false);
    });

    test('options indicate API key requirements correctly', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      const elevenlabsOption = options.find(opt => opt.key === 'elevenlabs');
      const azureOption = options.find(opt => opt.key === 'azure');
      const webSpeechOption = options.find(opt => opt.key === 'web-speech');

      expect(elevenlabsOption?.requiresApiKey).toBe(true);
      expect(azureOption?.requiresApiKey).toBe(true);
      expect(webSpeechOption?.requiresApiKey).toBe(false);
    });
  });

  describe('Dependency Injection', () => {
    test('factory creates adapters with proper dependencies', () => {
      const config = { apiKey: 'test-key' };
      factory.createAdapter('elevenlabs', config);

      const constructorCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];

      // Should receive config and textProcessor
      expect(constructorCall).toHaveLength(2);
      expect(constructorCall[0]).toBeDefined(); // config
      expect(constructorCall[1]).toBeDefined(); // textProcessor
    });

    test('adapters receive consistent dependency structure', () => {
      const config = { apiKey: 'test-key' };
      factory.createAdapter('elevenlabs', config);
      factory.createAdapter('azure', config);

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      // Both should receive the same dependency structure
      expect(elevenlabsCall).toHaveLength(2);
      expect(azureCall).toHaveLength(2);
    });

    test('factory uses shared text processor instance', () => {
      const config = { apiKey: 'test-key' };
      factory.createAdapter('elevenlabs', config);
      factory.createAdapter('azure', config);

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      // Both should receive the same textProcessor instance
      expect(elevenlabsCall[1]).toBe(azureCall[1]);
    });
  });
});
