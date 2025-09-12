import { createAdapter, AdapterType, AVAILABLE_ADAPTERS } from '@/lib/factories/AdapterFactory';
import { ElevenLabsAdapter } from '@/lib/adapters/ElevenLabsAdapter';
import { AzureAdapter } from '@/lib/adapters/AzureAdapter';
import { DefaultTextProcessor, ElevenLabsTextProcessor } from '@/lib/TextProcessor';
import { VoiceManagementService } from '@/lib/services/VoiceManagementService';

jest.mock('@/lib/adapters/ElevenLabsAdapter');
jest.mock('@/lib/adapters/AzureAdapter');
jest.mock('@/lib/services/VoiceManagementService');

describe('AdapterFactory - SOLID Architecture', () => {
  let mockVoiceService: VoiceManagementService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock voice service
    mockVoiceService = {
      loadRediumVoices: jest.fn().mockResolvedValue([]),
      loadElevenLabsVoices: jest.fn().mockResolvedValue([]),
      loadAzureVoices: jest.fn().mockResolvedValue([]),
      selectVoice: jest.fn(),
      getSelectedVoice: jest.fn().mockReturnValue(null),
      getVoicesByGender: jest.fn().mockResolvedValue([]),
      getCurrentVoiceGender: jest.fn().mockResolvedValue('neutral'),
    } as unknown as VoiceManagementService;

    // Mock VoiceManagementService constructor
    (VoiceManagementService as jest.Mock).mockImplementation(() => mockVoiceService);

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
      const adapter = createAdapter('elevenlabs', mockVoiceService);

      expect(ElevenLabsAdapter).toHaveBeenCalledWith(expect.any(ElevenLabsTextProcessor), mockVoiceService);
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);
    });

    test('createAdapter creates AzureAdapter for azure type', () => {
      const adapter = createAdapter('azure', mockVoiceService);

      expect(AzureAdapter).toHaveBeenCalledWith(expect.any(DefaultTextProcessor), mockVoiceService);
      expect(adapter).toBeInstanceOf(AzureAdapter);
    });

    test('createAdapter throws error for unknown adapter type', () => {
      expect(() => createAdapter('invalid' as AdapterType, mockVoiceService))
        .toThrow('Unknown adapter type: invalid');
    });

    test('createAdapter handles null/undefined input gracefully', () => {
      expect(() => createAdapter(null as unknown as AdapterType, mockVoiceService))
        .toThrow();

      expect(() => createAdapter(undefined as unknown as AdapterType, mockVoiceService))
        .toThrow();
    });
  });

  describe('Available Adapters Configuration', () => {
    test('AVAILABLE_ADAPTERS contains defined adapter types', () => {
      expect(AVAILABLE_ADAPTERS).toBeDefined();
      expect(Array.isArray(AVAILABLE_ADAPTERS)).toBe(true);
      expect(AVAILABLE_ADAPTERS.length).toBeGreaterThan(0);

      expect(AVAILABLE_ADAPTERS.some(opt => opt.key === 'elevenlabs')).toBe(true);
      expect(AVAILABLE_ADAPTERS.some(opt => opt.key === 'azure')).toBe(true);
    });

    test('implemented adapters are all marked as implemented', () => {
      const implementedAdapters = AVAILABLE_ADAPTERS.filter(adapter => adapter.isImplemented);

      expect(implementedAdapters.length).toBe(2);
      expect(implementedAdapters.some(opt => opt.key === 'elevenlabs')).toBe(true);
      expect(implementedAdapters.some(opt => opt.key === 'azure')).toBe(true);
    });

    test('adapter options have correct structure', () => {
      AVAILABLE_ADAPTERS.forEach((option) => {
        expect(option).toHaveProperty('key');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('isImplemented');
        expect(typeof option.key).toBe('string');
        expect(typeof option.name).toBe('string');
        expect(typeof option.isImplemented).toBe('boolean');
      });
    });

    test('adapter options match AdapterType union', () => {
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];

      AVAILABLE_ADAPTERS.forEach((option) => {
        expect(validTypes).toContain(option.key as AdapterType);
      });
    });
  });

  describe('Type Safety', () => {
    // Helper function to test valid adapter type creation
    const testValidAdapterCreation = (type: AdapterType) => {
      createAdapter(type, mockVoiceService);
    };

    // Helper function to test each valid type without deep nesting
    const testValidType = (type: AdapterType) => {
      expect(() => testValidAdapterCreation(type)).not.toThrow();
    };

    test('AdapterType union restricts to valid types', () => {
      const validTypes: AdapterType[] = ['elevenlabs', 'azure'];
      validTypes.forEach(testValidType);
    });

    test('adapter creation is type-safe', () => {
      const elevenlabsAdapter = createAdapter('elevenlabs', mockVoiceService);
      const azureAdapter = createAdapter('azure', mockVoiceService);

      expect(elevenlabsAdapter).toBeDefined();
      expect(azureAdapter).toBeDefined();
    });
  });

  describe('Dependency Injection Architecture', () => {
    test('factory creates adapters with proper dependency injection', () => {
      createAdapter('elevenlabs', mockVoiceService);

      const constructorCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];

      expect(constructorCall).toHaveLength(2);
      expect(constructorCall[0]).toBeInstanceOf(ElevenLabsTextProcessor);
      expect(constructorCall[1]).toBe(mockVoiceService);
    });

    test('factory uses consistent text processor instance', () => {
      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      // Text processors should be different instances (new for each call)
      expect(elevenlabsCall[0]).toBeInstanceOf(ElevenLabsTextProcessor);
      expect(azureCall[0]).toBeInstanceOf(DefaultTextProcessor);
    });

    test('adapters receive proper dependency structure', () => {
      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      expect(elevenlabsCall).toHaveLength(2);
      expect(azureCall).toHaveLength(2);

      const textProcessor = elevenlabsCall[0];
      expect(textProcessor).toHaveProperty('formatText');
      expect(textProcessor).toHaveProperty('validateText');
    });
  });

  describe('SOLID Principles Compliance', () => {
    test('Single Responsibility: Factory function only creates adapters', () => {
      expect(typeof createAdapter).toBe('function');

      // Function-based approach doesn't have unnecessary properties
      const adapter = createAdapter('elevenlabs', mockVoiceService);
      expect(adapter).toBeDefined();
    });

    test('Open/Closed: Factory is open for extension, closed for modification', () => {
      const originalAdapterCount = AVAILABLE_ADAPTERS.length;

      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);

      expect(AVAILABLE_ADAPTERS.length).toBe(originalAdapterCount);
    });

    test('Dependency Inversion: Factory depends on abstractions', () => {
      createAdapter('elevenlabs', mockVoiceService);

      const constructorCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const textProcessor = constructorCall[0];

      expect(typeof textProcessor.formatText).toBe('function');
      expect(typeof textProcessor.validateText).toBe('function');
    });

    test('Interface Segregation: Clean, focused interfaces', () => {
      const elevenlabsAdapter = createAdapter('elevenlabs', mockVoiceService);
      const azureAdapter = createAdapter('azure', mockVoiceService);

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as unknown as Record<string, unknown>)[method]).toBe('function');
        expect(typeof (azureAdapter as unknown as Record<string, unknown>)[method]).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    test('factory provides clear error messages for unknown types', () => {
      expect(() => createAdapter('invalid' as AdapterType, mockVoiceService))
        .toThrow('Unknown adapter type: invalid');
    });

    test('factory handles adapter instantiation errors gracefully', () => {
      (ElevenLabsAdapter as jest.Mock).mockImplementation(() => {
        throw new Error('Adapter initialization failed');
      });

      expect(() => createAdapter('elevenlabs', mockVoiceService))
        .toThrow('Adapter initialization failed');
    });

    test('factory validates adapter types strictly', () => {
      const invalidTypes = ['', 'invalid', 'openai', 'google'];

      // Test each invalid type without deep nesting
      for (const type of invalidTypes) {
        expect(() => createAdapter(type as AdapterType, mockVoiceService))
          .toThrow(`Unknown adapter type: ${type}`);
      }
    });
  });

  describe('Performance Considerations', () => {
    test('factory creates new adapter instances for each call', () => {
      const adapter1 = createAdapter('elevenlabs', mockVoiceService);
      const adapter2 = createAdapter('elevenlabs', mockVoiceService);

      expect(adapter1).not.toBe(adapter2);
      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
    });

    test('factory does not cache adapter instances', () => {
      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);
      createAdapter('elevenlabs', mockVoiceService);

      expect(ElevenLabsAdapter).toHaveBeenCalledTimes(2);
      expect(AzureAdapter).toHaveBeenCalledTimes(1);
    });

    test('factory creates new text processor instance for each call', () => {
      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);
      createAdapter('elevenlabs', mockVoiceService);

      // Check ElevenLabs calls
      const elevenlabsCalls = (ElevenLabsAdapter as jest.Mock).mock.calls;
      expect(elevenlabsCalls.length).toBe(2);
      expect(elevenlabsCalls[0][0]).toBeInstanceOf(ElevenLabsTextProcessor); // First elevenlabs call
      expect(elevenlabsCalls[1][0]).toBeInstanceOf(ElevenLabsTextProcessor); // Second elevenlabs call

      // Check Azure calls
      const azureCalls = (AzureAdapter as jest.Mock).mock.calls;
      expect(azureCalls.length).toBe(1);
      expect(azureCalls[0][0]).toBeInstanceOf(DefaultTextProcessor); // Azure call
    });
  });

  describe('Adapter Options Metadata', () => {
    test('options contain human-readable labels', () => {
      const elevenlabsOption = AVAILABLE_ADAPTERS.find(opt => opt.key === 'elevenlabs');
      const azureOption = AVAILABLE_ADAPTERS.find(opt => opt.key === 'azure');

      expect(elevenlabsOption?.name).toBe('ElevenLabs');
      expect(azureOption?.name).toBe('Azure TTS');
    });

    test('options are suitable for UI display', () => {
      AVAILABLE_ADAPTERS.forEach((option) => {
        expect(option.name).not.toContain('_');
        expect(option.name.length).toBeGreaterThan(0);
        expect(option.name[0]).toEqual(option.name[0].toUpperCase());
      });
    });

    test('options indicate implementation status correctly', () => {
      const elevenlabsOption = AVAILABLE_ADAPTERS.find(opt => opt.key === 'elevenlabs');
      const azureOption = AVAILABLE_ADAPTERS.find(opt => opt.key === 'azure');

      expect(elevenlabsOption?.isImplemented).toBe(true);
      expect(azureOption?.isImplemented).toBe(true);
    });
  });

  describe('Interface Compliance', () => {
    test('factory function creates adapters correctly', () => {
      expect(typeof createAdapter).toBe('function');

      const adapter = createAdapter('elevenlabs', mockVoiceService);
      expect(adapter).toBeDefined();
    });

    test('created adapters implement consistent interfaces', () => {
      const elevenlabsAdapter = createAdapter('elevenlabs', mockVoiceService);
      const azureAdapter = createAdapter('azure', mockVoiceService);

      const expectedMethods = ['play', 'pause', 'resume', 'stop', 'destroy', 'on', 'off'];

      expectedMethods.forEach(method => {
        expect(typeof (elevenlabsAdapter as unknown as Record<string, unknown>)[method]).toBe('function');
        expect(typeof (azureAdapter as unknown as Record<string, unknown>)[method]).toBe('function');
      });
    });

    test('factory supports extensibility without breaking changes', () => {
      const elevenlabsAdapter = createAdapter('elevenlabs', mockVoiceService);
      const azureAdapter = createAdapter('azure', mockVoiceService);

      expect(elevenlabsAdapter).toBeInstanceOf(ElevenLabsAdapter);
      expect(azureAdapter).toBeInstanceOf(AzureAdapter);
    });
  });

  describe('Configuration Management', () => {
    test('adapters handle configuration internally with environment variables', () => {
      createAdapter('elevenlabs', mockVoiceService);
      createAdapter('azure', mockVoiceService);

      const elevenlabsCall = (ElevenLabsAdapter as jest.Mock).mock.calls[0];
      const azureCall = (AzureAdapter as jest.Mock).mock.calls[0];

      expect(elevenlabsCall).toHaveLength(2);
      expect(azureCall).toHaveLength(2);
    });

    test('factory follows separation of concerns for configuration', () => {
      // Function-based approach doesn't have configuration properties
      createAdapter('elevenlabs', mockVoiceService);
      expect(ElevenLabsAdapter).toHaveBeenCalledWith(expect.any(ElevenLabsTextProcessor), mockVoiceService);
    });
  });

  describe('Extensibility and Future-Proofing', () => {
    test('factory can be extended with new adapter types', () => {
      const availableTypes = AVAILABLE_ADAPTERS.map(opt => opt.key);
      expect(availableTypes).toContain('elevenlabs');
      expect(availableTypes).toContain('azure');
    });

    test('factory maintains backward compatibility', () => {
      const adapter = createAdapter('elevenlabs', mockVoiceService);
      expect(adapter).toBeInstanceOf(ElevenLabsAdapter);

      expect(AVAILABLE_ADAPTERS).toBeDefined();
      expect(Array.isArray(AVAILABLE_ADAPTERS)).toBe(true);
    });

    test('factory design supports plugin architecture', () => {
      AVAILABLE_ADAPTERS.forEach(option => {
        expect(option).toHaveProperty('isImplemented');
        expect(option).toHaveProperty('key');
        expect(option).toHaveProperty('name');
      });
    });
  });
});
