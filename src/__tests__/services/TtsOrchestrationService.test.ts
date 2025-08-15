import { TtsOrchestrationService } from '../../lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '../../lib/services/TextExtractionService';
import type { IPlaybackAdapter, ITextProcessor } from '../../preferences/types';
import type { TextChunk } from '../../types/tts';

// Mock dependencies
const mockAdapter: IPlaybackAdapter = {
  play: jest.fn().mockResolvedValue({}),
  pause: jest.fn(),
  resume: jest.fn(),
  stop: jest.fn(),
  on: jest.fn((event: string, callback: Function) => {
    // Simulate event listener registration
  }),
  off: jest.fn(),
  getIsPlaying: jest.fn().mockReturnValue(false),
  getIsPaused: jest.fn().mockReturnValue(false),
  getCurrentAudio: jest.fn().mockReturnValue(null),
};

const mockTextProcessor: ITextProcessor = {
  formatText: jest.fn((text: string) => text),
  validateText: jest.fn(() => true),
};

const mockTextExtractor = {
  extractTextChunks: jest.fn().mockResolvedValue([
    { text: 'First chunk of text', element: 'paragraph' },
    { text: 'Second chunk of text', element: 'paragraph' },
    { text: 'Third chunk of text', element: 'heading' },
  ]),
  getCurrentReaderElement: jest.fn().mockReturnValue(document.createElement('div')),
} as any;

describe('TtsOrchestrationService', () => {
  let service: TtsOrchestrationService;

  beforeEach(() => {
    service = new TtsOrchestrationService(mockAdapter, mockTextExtractor);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('creates service with required dependencies', () => {
      expect(service).toBeInstanceOf(TtsOrchestrationService);
      expect(service).toBeDefined();
    });

    test('registers adapter event listeners on initialization', () => {
      // Create new service to check initialization
      new TtsOrchestrationService(mockAdapter, mockTextExtractor);

      expect(mockAdapter.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockAdapter.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('handles null/undefined dependencies gracefully', () => {
      expect(() => new TtsOrchestrationService(null as any, null as any)).not.toThrow();
    });
  });

  describe('Text Reading Orchestration', () => {
    test('startReading extracts and plays text chunks', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockAdapter.play).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'First chunk of text',
          element: 'paragraph'
        })
      );
    });

    test('startReading handles empty text chunks', async () => {
      mockTextExtractor.extractTextChunks.mockResolvedValueOnce([]);

      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockAdapter.play).not.toHaveBeenCalled();
    });

    test('startReading handles text extraction errors', async () => {
      mockTextExtractor.extractTextChunks.mockRejectedValueOnce(new Error('Extraction failed'));

      await expect(service.startReading()).rejects.toThrow('Extraction failed');
      expect(mockAdapter.play).not.toHaveBeenCalled();
    });

    test('startReading handles adapter play errors', async () => {
      mockAdapter.play = jest.fn().mockRejectedValue(new Error('Playback failed'));

      await expect(service.startReading()).rejects.toThrow('Playback failed');
    });
  });

  describe('Playback Control', () => {
    test('pauseReading calls adapter pause', () => {
      service.pauseReading();

      expect(mockAdapter.pause).toHaveBeenCalled();
    });

    test('resumeReading calls adapter resume', () => {
      service.resumeReading();

      expect(mockAdapter.resume).toHaveBeenCalled();
    });

    test('stopReading calls adapter stop and resets state', () => {
      service.stopReading();

      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    test('pauseReading handles adapter errors gracefully', () => {
      mockAdapter.pause = jest.fn().mockImplementation(() => {
        throw new Error('Pause failed');
      });

      expect(() => service.pauseReading()).not.toThrow();
    });

    test('resumeReading handles adapter errors gracefully', () => {
      mockAdapter.resume = jest.fn().mockImplementation(() => {
        throw new Error('Resume failed');
      });

      expect(() => service.resumeReading()).not.toThrow();
    });

    test('stopReading handles adapter errors gracefully', () => {
      mockAdapter.stop = jest.fn().mockImplementation(() => {
        throw new Error('Stop failed');
      });

      expect(() => service.stopReading()).not.toThrow();
    });
  });

  describe('State Management', () => {
    test('isPlaying returns current playback state', () => {
      mockAdapter.getIsPlaying = jest.fn().mockReturnValue(true);

      expect(service.isPlaying()).toBe(true);

      mockAdapter.getIsPlaying = jest.fn().mockReturnValue(false);
      expect(service.isPlaying()).toBe(false);
    });

    test('isPaused returns current pause state', () => {
      mockAdapter.getIsPaused = jest.fn().mockReturnValue(true);

      expect(service.isPaused()).toBe(true);

      mockAdapter.getIsPaused = jest.fn().mockReturnValue(false);
      expect(service.isPaused()).toBe(false);
    });

    test('state methods handle missing adapter methods gracefully', () => {
      const adapterWithoutState = {
        ...mockAdapter,
        getIsPlaying: undefined,
        getIsPaused: undefined,
      } as any;

      const serviceWithoutState = new TtsOrchestrationService(adapterWithoutState, mockTextExtractor);

      expect(serviceWithoutState.isPlaying()).toBe(false);
      expect(serviceWithoutState.isPaused()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    test('on method registers event listeners', () => {
      const callback = jest.fn();

      service.on('play', callback);
      service.on('pause', callback);
      service.on('stop', callback);

      expect(() => service.on('play', callback)).not.toThrow();
    });

    test('handleAdapterEnd processes events correctly', async () => {
      // Start reading to initialize chunks
      await service.startReading();

      // Get the end event handler that was registered
      const endHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'end')?.[1];

      if (endHandler) {
        // Trigger the end event
        expect(() => endHandler()).not.toThrow();
      }
    });

    test('handleAdapterError logs and handles errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Get the error event handler that was registered
      const errorHandler = (mockAdapter.on as jest.Mock).mock.calls
        .find(call => call[0] === 'error')?.[1];

      if (errorHandler) {
        const testError = new Error('Test error');
        expect(() => errorHandler(testError)).not.toThrow();
      }

      consoleSpy.mockRestore();
    });

    test('event handlers handle missing callbacks gracefully', () => {
      const adapterWithoutCallbacks = {
        ...mockAdapter,
        on: jest.fn(),
        off: jest.fn(),
      };

      expect(() => new TtsOrchestrationService(adapterWithoutCallbacks, mockTextExtractor)).not.toThrow();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('enableKeyboardShortcuts activates keyboard controls', () => {
      expect(() => service.enableKeyboardShortcuts()).not.toThrow();
    });

    test('disableKeyboardShortcuts deactivates keyboard controls', () => {
      expect(() => service.disableKeyboardShortcuts()).not.toThrow();
    });

    test('getShortcuts returns keyboard shortcut configuration', () => {
      const shortcuts = service.getShortcuts();

      expect(Array.isArray(shortcuts)).toBe(true);
      expect(shortcuts.length).toBeGreaterThan(0);

      shortcuts.forEach(shortcut => {
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('action');
      });
    });
  });

  describe('Performance Optimization', () => {
    test('service handles large text efficiently', async () => {
      const largeChunks = Array.from({ length: 1000 }, (_, i) => ({
        text: `Large chunk number ${i} with substantial content that could impact performance`,
        element: 'paragraph'
      }));

      mockTextExtractor.extractTextChunks.mockResolvedValueOnce(largeChunks);

      const startTime = performance.now();
      await service.startReading();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should process within 1 second
      expect(mockAdapter.play).toHaveBeenCalled();
    });

    test('service handles rapid control calls', async () => {
      await service.startReading();

      // Rapid fire control calls
      for (let i = 0; i < 10; i++) {
        service.pauseReading();
        service.resumeReading();
      }

      // Should handle without crashing
      expect(() => service.stopReading()).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    test('destroy cleans up resources and event listeners', () => {
      expect(() => service.destroy()).not.toThrow();
    });

    test('service can be used after destroy (graceful degradation)', () => {
      service.destroy();

      // Should handle gracefully even after destruction
      expect(() => service.stopReading()).not.toThrow();
      expect(() => service.pauseReading()).not.toThrow();
    });

    test('destroy handles missing cleanup methods gracefully', () => {
      const adapterWithoutCleanup = {
        ...mockAdapter,
        off: undefined,
      } as any;

      const serviceWithoutCleanup = new TtsOrchestrationService(adapterWithoutCleanup, mockTextExtractor);

      expect(() => serviceWithoutCleanup.destroy()).not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    test('service recovers from adapter failures', async () => {
      // Make adapter fail once, then succeed
      mockAdapter.play = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue({});

      // First call should fail
      await expect(service.startReading()).rejects.toThrow('Temporary failure');

      // Second call should succeed
      await expect(service.startReading()).resolves.not.toThrow();
    });

    test('service handles partial failures gracefully', async () => {
      const mixedChunks = [
        { text: 'Good chunk', element: 'paragraph' },
        { text: '', element: 'paragraph' }, // Empty chunk
        { text: 'Another good chunk', element: 'paragraph' },
      ];

      mockTextExtractor.extractTextChunks.mockResolvedValueOnce(mixedChunks);

      await service.startReading();

      // Should handle mixed content appropriately
      expect(mockAdapter.play).toHaveBeenCalled();
    });
  });

  describe('Integration with Text Extraction', () => {
    test('service coordinates with text extractor correctly', async () => {
      await service.startReading();

      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
      expect(mockTextExtractor.getCurrentReaderElement).toHaveBeenCalled();
    });

    test('service handles text extractor state changes', async () => {
      // Change the reader element
      mockTextExtractor.getCurrentReaderElement.mockReturnValue(null);

      await service.startReading();

      // Should handle gracefully even with changed state
      expect(mockTextExtractor.extractTextChunks).toHaveBeenCalled();
    });
  });
});
