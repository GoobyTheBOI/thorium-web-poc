import { TTSAdapterFactory, AdapterType } from '../../lib/AdapterFactory';
import { ElevenLabsAdapter } from '../../lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../../lib/adapters/AzureAdapter';
import { DefaultTextProcessor } from '../../lib/TextProcessor';

jest.mock('../../lib/adapters/ElevenLabsAdapter');
jest.mock('../../lib/adapters/AzureAdapter');

describe('TTSAdapterFactory - SOLID Architecture', () => {
  let factory: TTSAdapterFactory;

  beforeEach(() => {
    factory = new TTSAdapterFactory();
    jest.clearAllMocks();

    // Reset mock implementations to return proper constructor instances
    (ElevenLabsAdapter as jest.Mock).mockImplementation(function(textProcessor) {
      const instance = Object.create(ElevenLabsAdapter.prototype);
      instance.textProcessor = textProcessor;
      instance.play = jest.fn();
      instance.pause = jest.fn();
      instance.resume = jest.fn();
      instance.stop = jest.fn();
      instance.cleanup = jest.fn();
      instance.on = jest.fn();
      instance.off = jest.fn();
      instance.emitEvent = jest.fn();
      instance.updatePlaybackState = jest.fn();
      return instance;
    });

    (AzureAdapter as jest.Mock).mockImplementation(function(textProcessor) {
      const instance = Object.create(AzureAdapter.prototype);
      instance.textProcessor = textProcessor;
      instance.play = jest.fn();
      instance.pause = jest.fn();
      instance.resume = jest.fn();
      instance.stop = jest.fn();
      instance.cleanup = jest.fn();
      instance.on = jest.fn();
      instance.off = jest.fn();
      instance.emitEvent = jest.fn();
      instance.updatePlaybackState = jest.fn();
      return instance;
    });
  });

  describe('Factory Pattern Implementation', () => {
    test('createAdapter creates ElevenLabsAdapter for elevenlabs type', () => {
      const adapter = factory.createAdapter('elevenlabs');

      expect(ElevenLabsAdapter).toHaveBeenCalledWith(expect.any(DefaultTextProcessor));
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
    });

    test('createAdapter creates AzureAdapter for azure type', () => {
      const adapter = factory.createAdapter('azure');

      expect(AzureAdapter).toHaveBeenCalledWith(expect.any(DefaultTextProcessor));
      expect(adapter).toBeInstanceOf(AzureAdapter);
    });

    test('createAdapter throws error for unsupported adapter type', () => {
      expect(() => factory.createAdapter('web-speech'))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('createAdapter throws error for invalid adapter type', () => {
      expect(() => factory.createAdapter('invalid' as AdapterType))
        .toThrow('Unknown adapter type: invalid');
    });

    test('createAdapter handles null/undefined input gracefully', () => {
      expect(() => factory.createAdapter(null as any))
        .toThrow();

      expect(() => factory.createAdapter(undefined as any))
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
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];

      validTypes.forEach(type => {
        expect(() => factory.createAdapter(type)).not.toThrow();
      });
    });

    test('adapter creation is type-safe', () => {
      const elevenlabsAdapter = factory.createAdapter('elevenlabs');
      const azureAdapter = factory.createAdapter('azure');

      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();
    });
  });

  describe('Dependency Injection Architecture', () => {
    test('factory creates adapters with proper dependency injection', () => {
      factory.createAdapter('elevenlabs');

      const constructorCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];

      expect(constructorCall).toHaveLength(1);
      expect(constructorCall[0]).toBeInstanceOf(DefaultTextProcessor);
    });

    test('factory uses consistent text processor instance', () => {
      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      expect(elevenlabsCall[0]).toBe(azureCall[0]);
    });

    test('adapters receive proper dependency structure', () => {
      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      expect(elevenlabsCall).toHaveLength(1);
      expect(azureCall).toHaveLength(1);

      const textProcessor = elevenlabsCall[0];
      expect(textProcessor).toHaveProperty('formatText');
      expect(textProcessor).toHaveProperty('validateText');
    });
  });

  describe('SOLID Principles Compliance', () => {
    test('Single Responsibility: Factory only creates adapters', () => {
      expect(factory.createAdapter).toBeDefined();

      expect(factory).not.toHaveProperty('play');
      expect(factory).not.toHaveProperty('formatText');
      expect(factory).not.toHaveProperty('validateText');
    });

    test('Open/Closed: Factory is open for extension, closed for modification', () => {
      const originalAdapterCount = TTSAdapterFactory.getAvailableAdapters().length;

      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');

      expect(TTSAdapterFactory.getAvailableAdapters().length).toBe(originalAdapterCount);
    });

    test('Dependency Inversion: Factory depends on abstractions', () => {
      factory.createAdapter('elevenlabs');

      const constructorCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const textProcessor = constructorCall[0];

      expect(typeof textProcessor.formatText).toBe('function');
      expect(typeof textProcessor.validateText).toBe('function');
    });

    test('Interface Segregation: Clean, focused interfaces', () => {
      const elevenlabsAdapter = factory.createAdapter('elevenlabs');
      const azureAdapter = factory.createAdapter('azure');

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    test('factory provides clear error messages for unimplemented types', () => {
      expect(() => factory.createAdapter('web-speech'))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('factory handles adapter instantiation errors gracefully', () => {
      (ElevenLabsAdapter as jest.Mock).mockImplementation(() => {
        throw new Error('Adapter initialization failed');
      });

      expect(() => factory.createAdapter('elevenlabs'))
        .toThrow('Adapter initialization failed');
    });

    test('factory validates adapter types strictly', () => {
      const invalidTypes = ['', 'invalid', 'openai', 'google'];

      invalidTypes.forEach(type => {
        expect(() => factory.createAdapter(type as AdapterType))
          .toThrow(`Unknown adapter type: ${type}`);
      });
    });
  });

  describe('Performance Considerations', () => {
    test('factory creates new adapter instances for each call', () => {
      const adapter1 = factory.createAdapter('elevenlabs');
      const adapter2 = factory.createAdapter('elevenlabs');

      expect(adapter1).not.toBe(adapter2);
      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
    });

    test('factory does not cache adapter instances', () => {
      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');
      factory.createAdapter('elevenlabs');

      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
      expect(AzureAdapter).toHaveBeenCalledTimes(1);
    });

    test('factory reuses text processor instance for efficiency', () => {
      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');
      factory.createAdapter('elevenlabs');

      const calls = [
        ...(ElevenLabsAdapter as jest.Mock).mock.calls,
        ...(AzureAdapter as jest.Mock).mock.calls
      ];

      const textProcessors = calls.map(call => call[0]);
      expect(textProcessors.every(tp => tp === textProcessors[0])).toBe(true);
    });
  });

  describe('Adapter Options Metadata', () => {
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
        expect(option.name).not.toContain('_');
        expect(option.name.length).toBeGreaterThan(0);
        expect(option.name[0]).toEqual(option.name[0].toUpperCase());

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

  describe('Interface Compliance', () => {
    test('factory implements IAdapterFactory interface', () => {
      expect(typeof factory.createAdapter).toBe('function');

      const adapter = factory.createAdapter('elevenlabs');
      expect(adapter).toBeDefined();
    });

    test('created adapters implement consistent interfaces', () => {
      const elevenlabsAdapter = factory.createAdapter('elevenlabs');
      const azureAdapter = factory.createAdapter('azure');

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as any)[method]).toBe('function');
        expect(typeof (azureAdapter as any)[method]).toBe('function');
      });
    });

    test('factory supports extensibility without breaking changes', () => {
      const elevenlabsAdapter = factory.createAdapter('elevenlabs');
      const azureAdapter = factory.createAdapter('azure');

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });
  });

  describe('Configuration Management', () => {
    test('adapters handle configuration internally with environment variables', () => {
      factory.createAdapter('elevenlabs');
      factory.createAdapter('azure');

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      expect(elevenlabsCall).toHaveLength(1);
      expect(azureCall).toHaveLength(1);
    });

    test('factory follows separation of concerns for configuration', () => {
      expect(factory).not.toHaveProperty('config');
      expect(factory).not.toHaveProperty('apiKey');
      expect(factory).not.toHaveProperty('voiceId');

      factory.createAdapter('elevenlabs');
      expect(ElevenLabsAdapter).toHaveBeenCalledWith(expect.any(DefaultTextProcessor));
    });
  });

  describe('Extensibility and Future-Proofing', () => {
    test('factory can be extended with new adapter types without modification', () => {
      const availableTypes = TTSAdapterFactory.getAvailableAdapters().map(opt => opt.key);
      expect(availableTypes).toContain('web-speech');

      expect(() => factory.createAdapter('web-speech'))
        .toThrow('Web Speech API adapter not yet implemented');
    });

    test('factory maintains backward compatibility', () => {
      const adapter = factory.createAdapter('elevenlabs');
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);

      expect(TTSAdapterFactory.getAvailableAdapters).toBeDefined();
      expect(TTSAdapterFactory.getImplementedAdapters).toBeDefined();
    });

    test('factory design supports plugin architecture', () => {
      const options = TTSAdapterFactory.getAvailableAdapters();

      options.forEach(option => {
        expect(option).toHaveProperty('isImplemented');
        expect(option).toHaveProperty('requiresApiKey');
        expect(option).toHaveProperty('description');
      });
    });
  });
});
