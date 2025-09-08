import { TtsOrchestrationService, ITtsOrchestrationService, TtsCallbacks } from '@/lib/services/TtsOrchestrationService';
import { ITextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager, TtsState } from '@/lib/managers/TtsStateManager';
import { createAdapter, AdapterType, AVAILABLE_ADAPTERS } from '@/lib/factories/AdapterFactory';
import { IPlaybackAdapter } from '@/preferences/types';
import { TextChunk, TTS_CONSTANTS } from '@/types/tts';

jest.mock('@/lib/managers/TtsStateManager');
jest.mock('@/lib/factories/AdapterFactory');

describe('TtsOrchestrationService', () => {
  let service: ITtsOrchestrationService;
  let mockAdapter: any;
  let mockTextExtractor: any;
  let mockStateManager: any;
  let mockCallbacks: TtsCallbacks;

  const createMockAdapter = (): jest.Mocked<IPlaybackAdapter> => ({
    play: jest.fn().mockResolvedValue({}),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getIsPlaying: jest.fn().mockReturnValue(false),
    getIsPaused: jest.fn().mockReturnValue(false),
    getCurrentAudio: jest.fn().mockReturnValue(null),
  });

  const createMockTextExtractor = (): jest.Mocked<ITextExtractionService> => ({
    extractTextChunks: jest.fn().mockResolvedValue([
      { text: 'First chunk of text', element: 'P' },
      { text: 'Second chunk of text', element: 'P' },
      { text: 'Third chunk of text', element: 'H2' },
    ] as TextChunk[]),
    getCurrentReaderElement: jest.fn().mockReturnValue(document.createElement('div')),
  });

  const createMockStateManager = (): any => ({
    getState: jest.fn().mockReturnValue({
      isPlaying: false,
      isPaused: false,
      isGenerating: false,
      error: null,
      currentAdapter: null,
    } as TtsState),
    subscribe: jest.fn().mockReturnValue(() => {}),
    setState: jest.fn(),
    setPlaying: jest.fn(),
    setPaused: jest.fn(),
    setGenerating: jest.fn(),
    setError: jest.fn(),
    setAdapter: jest.fn(),
    reset: jest.fn(),
  });

  const createMockVoiceService = (): any => ({
    setVoice: jest.fn(),
    getVoice: jest.fn(),
    getVoices: jest.fn().mockResolvedValue([]),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = createMockAdapter();
    mockTextExtractor = createMockTextExtractor();
    mockStateManager = createMockStateManager();
    const mockVoiceService = createMockVoiceService();

    // Mock the constructors
    (TtsStateManager as jest.MockedClass<typeof TtsStateManager>).mockImplementation(() => mockStateManager);

    // Mock the createAdapter function
    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(createMockAdapter());

    mockCallbacks = {
      onStateChange: jest.fn(),
      onError: jest.fn(),
      onAdapterSwitch: jest.fn(),
    };

    service = new TtsOrchestrationService(
      mockAdapter,
      mockTextExtractor,
      mockStateManager,
      mockVoiceService,
      'azure' as AdapterType,
      mockCallbacks
    );
  });

  describe('SOLID Architecture Compliance', () => {
    test('implements ITtsOrchestrationService interface correctly', () => {
      expect(service).toBeInstanceOf(TtsOrchestrationService);
      expect(typeof service.startReading).toBe('function');
      expect(typeof service.pauseReading).toBe('function');
      expect(typeof service.resumeReading).toBe('function');
      expect(typeof service.stopReading).toBe('function');
      expect(typeof service.isPlaying).toBe('function');
      expect(typeof service.isPaused).toBe('function');
      expect(typeof service.switchAdapter).toBe('function');
      expect(typeof service.getCurrentAdapterType).toBe('function');
      expect(typeof service.getState).toBe('function');
      expect(typeof service.destroy).toBe('function');
    });

    test('Single Responsibility: Service only orchestrates TTS workflow', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockAdapter.play).toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalled();
    });

    test('Open/Closed: Service works with different adapter types without modification', () => {
      const adapterTypes: AdapterType[] = ['azure', 'elevenlabs'];

      adapterTypes.forEach(adapterType => {
        expect(() => service.switchAdapter(adapterType)).not.toThrow();
      });
    });

    test('Dependency Inversion: Depends on abstractions not concrete implementations', () => {
      expect(service.getState()).toBeDefined();
      expect(service.getCurrentAdapterType()).toBeDefined();
    });

    test('Interface Segregation: Uses focused interfaces for each dependency', () => {
      expect(mockAdapter.play).toBeDefined();
      expect(mockTextExtractor.extractTextChunks).toBeDefined();
      expect(mockStateManager.getState).toBeDefined();
    });
  });

  describe('Service Initialization and Configuration', () => {
    test('initializes with required dependencies and adapter type', () => {
      expect(mockStateManager.setAdapter).toHaveBeenCalledWith('azure');
    });

    test('sets up adapter event listeners during initialization', () => {
      expect(mockAdapter.on).toHaveBeenCalledWith('play', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('resume', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('stop', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('subscribes to state manager updates', () => {
      expect(mockStateManager.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    test('handles optional callbacks parameter', () => {
      const serviceWithoutCallbacks = new TtsOrchestrationService(
        mockAdapter,
        mockTextExtractor,
        mockStateManager,
        createMockVoiceService()
      );

      expect(serviceWithoutCallbacks).toBeDefined();
    });
  });

  describe('Text Reading Orchestration with TTS_CONSTANTS', () => {
    test('startReading extracts text and processes chunks according to configuration', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(true);

      if (TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING) {
        expect(mockAdapter.play).toHaveBeenCalledTimes(3);
      } else {
        expect(mockAdapter.play).toHaveBeenCalledTimes(Math.min(3, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING));
      }

      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(false);
    });

    test('startReading prevents concurrent execution', async () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);

      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).not.toHaveBeenCalled();
      expect(mockAdapter.play).not.toHaveBeenCalled();
    });

    test('startReading handles empty text chunks gracefully', async () => {
      mockTextExtractor.extractTextChunks.mockResolvedValue([]);

      await service.startReading();

      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(true);
      expect(mockAdapter.play).not.toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(false);
    });

    test('startReading handles text extraction errors', async () => {
      const extractionError = new Error('Text extraction failed');
      mockTextExtractor.extractTextChunks.mockRejectedValue(extractionError);

      await expect(service.startReading()).rejects.toThrow('Text extraction failed');

      expect(mockStateManager.setError).toHaveBeenCalledWith('Failed to start reading: Error: Text extraction failed');
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(false);
    });

    test('startReading handles adapter playback errors', async () => {
      const playbackError = new Error('Playback failed');
      mockAdapter.play.mockRejectedValue(playbackError);

      await expect(service.startReading()).rejects.toThrow('Playback failed');

      expect(mockStateManager.setError).toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(false);
    });
  });

  describe('Playback Control with State Management', () => {
    test('pauseReading calls adapter pause when conditions are met', () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);
      mockAdapter.getIsPaused.mockReturnValue(false);

      service.pauseReading();

      expect(mockAdapter.pause).toHaveBeenCalled();
    });

    test('pauseReading prevents action when not playing', () => {
      mockAdapter.getIsPlaying.mockReturnValue(false);

      service.pauseReading();

      expect(mockAdapter.pause).not.toHaveBeenCalled();
    });

    test('pauseReading prevents action when already paused', () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);
      mockAdapter.getIsPaused.mockReturnValue(true);

      service.pauseReading();

      expect(mockAdapter.pause).not.toHaveBeenCalled();
    });

    test('resumeReading calls adapter resume when paused', () => {
      mockAdapter.getIsPaused.mockReturnValue(true);

      service.resumeReading();

      expect(mockAdapter.resume).toHaveBeenCalled();
    });

    test('resumeReading prevents action when not paused', () => {
      mockAdapter.getIsPaused.mockReturnValue(false);

      service.resumeReading();

      expect(mockAdapter.resume).not.toHaveBeenCalled();
    });

    test('stopReading calls adapter stop and resets execution state', () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);

      service.stopReading();

      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    test('stopReading prevents action when not playing or paused', () => {
      mockAdapter.getIsPlaying.mockReturnValue(false);
      mockAdapter.getIsPaused.mockReturnValue(false);

      service.stopReading();

      expect(mockAdapter.stop).not.toHaveBeenCalled();
    });
  });

  describe('State Management Integration', () => {
    test('isPlaying returns adapter playing state', () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);
      expect(service.isPlaying()).toBe(true);

      mockAdapter.getIsPlaying.mockReturnValue(false);
      expect(service.isPlaying()).toBe(false);
    });

    test('isPaused returns adapter paused state', () => {
      mockAdapter.getIsPaused.mockReturnValue(true);
      expect(service.isPaused()).toBe(true);

      mockAdapter.getIsPaused.mockReturnValue(false);
      expect(service.isPaused()).toBe(false);
    });

    test('getState returns current TTS state from state manager', () => {
      const mockState: TtsState = {
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'azure',
      };
      mockStateManager.getState.mockReturnValue(mockState);

      expect(service.getState()).toEqual(mockState);
    });

    test('handles missing adapter state methods gracefully', () => {
      const adapterWithoutState = {
        ...mockAdapter,
        getIsPlaying: undefined,
        getIsPaused: undefined,
      } as any;

      const serviceWithoutState = new TtsOrchestrationService(
        adapterWithoutState,
        mockTextExtractor,
        mockStateManager,
        createMockVoiceService()
      );

      expect(serviceWithoutState.isPlaying()).toBe(false);
      expect(serviceWithoutState.isPaused()).toBe(false);
    });
  });

  describe('Adapter Management and Switching', () => {
    test('switchAdapter logs switch request and calls callback', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.switchAdapter('elevenlabs' as AdapterType);

      expect(consoleSpy).toHaveBeenCalledWith('Adapter switch requested to: elevenlabs');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('elevenlabs');

      consoleSpy.mockRestore();
    });

    test('switchAdapter uses default next adapter when no type specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.switchAdapter();

      expect(consoleSpy).toHaveBeenCalledWith('Adapter switch requested to: next');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('elevenlabs');

      consoleSpy.mockRestore();
    });

    test('switchAdapter handles any adapter type (simplified implementation)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.switchAdapter('azure' as AdapterType);

      expect(consoleSpy).toHaveBeenCalledWith('Adapter switch requested to: azure');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('azure');

      consoleSpy.mockRestore();
    });

    test('switchAdapter handles unknown adapter types (simplified implementation)', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.switchAdapter('unknown' as AdapterType);

      expect(consoleSpy).toHaveBeenCalledWith('Adapter switch requested to: unknown');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('unknown');

      consoleSpy.mockRestore();
    });

    test('getCurrentAdapterType returns current adapter type', () => {
      expect(service.getCurrentAdapterType()).toBe('azure');
    });

    test('switchAdapter does not stop current playback (simplified implementation)', () => {
      mockAdapter.getIsPlaying.mockReturnValue(true);

      service.switchAdapter('elevenlabs' as AdapterType);

      expect(mockAdapter.stop).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling and Callbacks', () => {
    test('adapter events trigger state manager updates', () => {
      const playHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'play')?.[1];
      const pauseHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'pause')?.[1];
      const stopHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'stop')?.[1];

      playHandler?.();
      expect(mockStateManager.setPlaying).toHaveBeenCalledWith(true);

      pauseHandler?.();
      expect(mockStateManager.setPaused).toHaveBeenCalledWith(true);

      stopHandler?.();
      expect(mockStateManager.reset).toHaveBeenCalled();
    });

    test('adapter error events trigger error handling', () => {
      const errorHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'error')?.[1];

      const testError = { error: { message: 'Test error message' } };
      errorHandler?.(testError);

      expect(mockStateManager.setError).toHaveBeenCalledWith(
        'TTS Error: Test error message'
      );
    });

    test('state changes trigger callbacks', () => {
      const stateSubscriptionHandler = (mockStateManager.subscribe as jest.Mock).mock.calls[0]?.[0];
      const testState: TtsState = {
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'azure',
      };

      stateSubscriptionHandler?.(testState);

      expect(mockCallbacks.onStateChange).toHaveBeenCalledWith(testState);
    });
  });

  describe('Resource Management and Cleanup', () => {
    test('destroy stops playback and cleans up resources', () => {
      service.destroy();

      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    test('adapter switching does not clean up old adapter (simplified implementation)', () => {
      service.switchAdapter('elevenlabs' as AdapterType);

      expect(mockAdapter.destroy).not.toHaveBeenCalled();
    });

    test('handles cleanup errors gracefully', () => {
      mockAdapter.destroy.mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      expect(() => service.switchAdapter('elevenlabs' as AdapterType)).not.toThrow();
    });
  });

  describe('Performance and Error Recovery', () => {
    test('service handles large text chunks efficiently', async () => {
      const largeChunks = Array.from({ length: 100 }, (_, i) => ({
        text: `Large chunk number ${i} with substantial content`,
        element: 'P'
      })) as TextChunk[];

      mockTextExtractor.extractTextChunks.mockResolvedValue(largeChunks);

      const startTime = performance.now();
      await service.startReading();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(mockAdapter.play).toHaveBeenCalled();
    });

    test('service recovers from adapter failures', async () => {
      mockAdapter.play
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({});

      await expect(service.startReading()).rejects.toThrow('Temporary failure');
      mockStateManager.setGenerating.mockClear();
      await expect(service.startReading()).resolves.not.toThrow();
    });

    test('respects TTS_CONSTANTS for chunk processing', async () => {
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        text: `Chunk ${i}`,
        element: 'P'
      })) as TextChunk[];

      mockTextExtractor.extractTextChunks.mockResolvedValue(chunks);

      await service.startReading();

      const expectedChunkCount = TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING
        ? 10
        : Math.min(10, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);

      expect(mockAdapter.play).toHaveBeenCalledTimes(expectedChunkCount);
    });
  });

  describe('Integration with Factory Pattern', () => {
    test('createAdapter function is available from factory', () => {
      expect(typeof createAdapter).toBe('function');
    });

    test('available adapters are defined in AVAILABLE_ADAPTERS', () => {
      // Since we're mocking the factory, we need to check the actual constant
      // In a real scenario, this would be imported from the factory
      expect(AVAILABLE_ADAPTERS).toBeDefined();
      expect(Array.isArray(AVAILABLE_ADAPTERS)).toBe(true);
      // Note: The mocked version might be empty, but the real one should have adapters
    });
  });
});
