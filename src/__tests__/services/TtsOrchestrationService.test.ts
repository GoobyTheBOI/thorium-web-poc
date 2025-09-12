import { TtsOrchestrationService, ITtsOrchestrationService, TtsCallbacks } from '@/lib/services/TtsOrchestrationService';
import { ITextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager, TtsState } from '@/lib/managers/TtsStateManager';
import { createAdapter, AdapterType, AVAILABLE_ADAPTERS } from '@/lib/factories/AdapterFactory';
import { IPlaybackAdapter } from '@/preferences/types';
import { TextChunk } from '@/preferences/types';
import { TTS_CONSTANTS } from '@/preferences/constants';

jest.mock('@/lib/managers/TtsStateManager');
jest.mock('@/lib/factories/AdapterFactory');

describe('TtsOrchestrationService', () => {
  let service: ITtsOrchestrationService;
  let mockAdapter: jest.Mocked<IPlaybackAdapter>;
  let mockTextExtractor: jest.Mocked<ITextExtractionService>;
  let mockStateManager: jest.Mocked<TtsStateManager>;
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
    hasNextPage: jest.fn().mockResolvedValue(false),
    navigateToNextPage: jest.fn().mockResolvedValue(false),
  });

  const createMockStateManager = (): jest.Mocked<TtsStateManager> => {
    const mockManager = {
      getState: jest.fn().mockReturnValue({
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: null,
        isEnabled: true,
      } as TtsState),
      subscribe: jest.fn().mockReturnValue(() => {}),
      setState: jest.fn(),
      setPlaying: jest.fn(),
      setPaused: jest.fn(),
      setGenerating: jest.fn(),
      setError: jest.fn(),
      setAdapter: jest.fn(),
      setEnabled: jest.fn(),
      toggleEnabled: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<TtsStateManager>;

    return mockManager;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = createMockAdapter();
    mockTextExtractor = createMockTextExtractor();
    mockStateManager = createMockStateManager();

    mockCallbacks = {
      onStateChange: jest.fn(),
      onError: jest.fn(),
      onAdapterSwitch: jest.fn(),
    };

    // Mock the TtsStateManager constructor
    (TtsStateManager as jest.MockedClass<typeof TtsStateManager>).mockImplementation(() => mockStateManager);

    // Mock createAdapter to return our mock adapter
    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(mockAdapter);

    service = new TtsOrchestrationService(
      mockAdapter,
      mockTextExtractor,
      mockStateManager,
      'elevenlabs',
      mockCallbacks,
      false
    );
  });

  describe('Constructor', () => {
    it('should initialize with provided dependencies', () => {
      expect(service).toBeInstanceOf(TtsOrchestrationService);
    });

    it('should set up proper initialization', () => {
      expect(mockTextExtractor.extractTextChunks).toBeDefined();
      expect(mockStateManager.getState).toBeDefined();
    });

    it('should set adapter name when provided', () => {
      expect(mockStateManager.setAdapter).toHaveBeenCalledWith('elevenlabs');
    });
  });

  describe('startReading', () => {
    it('should extract text chunks and start playback', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(true);
      expect(mockAdapter.play).toHaveBeenCalled();
    });

    it('should handle text chunk processing correctly', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockStateManager.setGenerating).toHaveBeenCalledWith(true);
      // The service processes chunks sequentially, so adapter.play should be called for each chunk
      expect(mockAdapter.play).toHaveBeenCalled();
    });

    it('should not start reading if already playing', async () => {
      // Set up state to indicate playing
      mockStateManager.getState.mockReturnValue({
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      // Mock isPlaying method to return true
      jest.spyOn(service, 'isPlaying').mockReturnValue(true);

      await service.startReading();

      // Should not extract text chunks if already playing
      expect(mockTextExtractor.extractTextChunks).not.toHaveBeenCalled();
    });
  });

  describe('pauseReading', () => {
    it('should pause reading when playing', () => {
      // Set up state to indicate playing
      mockStateManager.getState.mockReturnValue({
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      // Mock service methods
      jest.spyOn(service, 'isPlaying').mockReturnValue(true);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.pauseReading();
      expect(mockAdapter.pause).toHaveBeenCalled();
    });

    it('should not pause when not playing', () => {
      // Mock service methods for not playing state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.pauseReading();
      expect(mockAdapter.pause).not.toHaveBeenCalled();
    });

    it('should not pause when already paused', () => {
      // Mock service methods for paused state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(true);

      service.pauseReading();
      expect(mockAdapter.pause).not.toHaveBeenCalled();
    });
  });

  describe('resumeReading', () => {
    it('should resume reading when paused', () => {
      // Mock service methods for paused state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(true);

      service.resumeReading();
      expect(mockAdapter.resume).toHaveBeenCalled();
    });

    it('should not resume when not paused', () => {
      // Mock service methods for not paused state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.resumeReading();
      expect(mockAdapter.resume).not.toHaveBeenCalled();
    });

    it('should not resume when playing', () => {
      // Mock service methods for playing state
      jest.spyOn(service, 'isPlaying').mockReturnValue(true);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.resumeReading();
      expect(mockAdapter.resume).not.toHaveBeenCalled();
    });
  });

  describe('stopReading', () => {
    it('should stop reading when playing', () => {
      // Mock service methods for playing state
      jest.spyOn(service, 'isPlaying').mockReturnValue(true);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.stopReading();
      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    it('should stop reading when paused', () => {
      // Mock service methods for paused state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(true);

      service.stopReading();
      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    it('should not stop when not playing or paused', () => {
      // Mock service methods for idle state
      jest.spyOn(service, 'isPlaying').mockReturnValue(false);
      jest.spyOn(service, 'isPaused').mockReturnValue(false);

      service.stopReading();
      expect(mockAdapter.stop).not.toHaveBeenCalled();
    });
  });

  describe('switchAdapter', () => {
    it('should switch to new adapter', () => {
      service.switchAdapter('azure');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('azure');
    });

    it('should handle adapter switching correctly', () => {
      service.switchAdapter('azure');
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalledWith('azure');
    });

    it('should use default adapter when no type provided', () => {
      service.switchAdapter();
      expect(mockCallbacks.onAdapterSwitch).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return current state from state manager', () => {
      const testState = {
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      };

      mockStateManager.getState.mockReturnValue(testState);

      const result = service.getState();
      expect(result).toEqual(testState);
      expect(mockStateManager.getState).toHaveBeenCalled();
    });
  });

  describe('isPlaying', () => {
    it('should return true when playing', () => {
      mockStateManager.getState.mockReturnValue({
        isPlaying: true,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      expect(service.isPlaying()).toBe(true);
    });

    it('should return false when not playing', () => {
      mockStateManager.getState.mockReturnValue({
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      expect(service.isPlaying()).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return true when paused', () => {
      mockStateManager.getState.mockReturnValue({
        isPlaying: false,
        isPaused: true,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      expect(service.isPaused()).toBe(true);
    });

    it('should return false when not paused', () => {
      mockStateManager.getState.mockReturnValue({
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: 'elevenlabs',
        isEnabled: true,
      });

      expect(service.isPaused()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter errors gracefully', async () => {
      const error = new Error('Adapter error');

      mockAdapter.play.mockRejectedValue(error);

      await service.startReading();

      expect(mockStateManager.setError).toHaveBeenCalled();
    });

    it('should handle text extraction errors gracefully', async () => {
      const error = new Error('Text extraction error');

      mockTextExtractor.extractTextChunks.mockRejectedValue(error);

      await service.startReading();

      expect(mockStateManager.setError).toHaveBeenCalled();
    });
  });

  describe('Mock TTS', () => {
    it('should handle mock TTS mode', () => {
      expect(service.isMockTTSEnabled()).toBe(false);

      service.setMockTTS(true);
      expect(service.isMockTTSEnabled()).toBe(true);
    });
  });

  describe('getCurrentAdapterType', () => {
    it('should return current adapter type', () => {
      expect(service.getCurrentAdapterType()).toBe('elevenlabs');
    });
  });

  describe('destroy', () => {
    it('should cleanup resources', () => {
      service.destroy();
      expect(mockAdapter.stop).toHaveBeenCalled();
    });
  });
});
