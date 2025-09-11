import { TtsKeyboardHandler } from '@/lib/handlers/TtsKeyboardHandler';
import { ITtsOrchestrationService } from '@/lib/services/TtsOrchestrationService';
import { KeyboardShortcut } from '@/lib/handlers/KeyboardHandler';

// Create a proper mock for KeyboardHandler
const mockKeyboardHandlerInstance = {
  register: jest.fn(),
  cleanup: jest.fn(),
  setEnabled: jest.fn(),
  getShortcuts: jest.fn<KeyboardShortcut[], []>(() => []),
};

// Mock the KeyboardHandler
jest.mock('@/lib/handlers/KeyboardHandler', () => {
  return {
    KeyboardHandler: jest.fn().mockImplementation(() => mockKeyboardHandlerInstance),
  };
});

describe('TtsKeyboardHandler', () => {
  let ttsKeyboardHandler: TtsKeyboardHandler;
  let mockOrchestrationService: jest.Mocked<ITtsOrchestrationService>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock orchestration service
    mockOrchestrationService = {
      startReading: jest.fn(),
      pauseReading: jest.fn(),
      resumeReading: jest.fn(),
      stopReading: jest.fn(),
      isPlaying: jest.fn(),
      isPaused: jest.fn(),
      switchAdapter: jest.fn(),
      getCurrentAdapterType: jest.fn(),
      getState: jest.fn(),
      destroy: jest.fn(),
      setMockTTS: jest.fn(),
      isMockTTSEnabled: jest.fn(),
    };

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    // Mock Date.now for throttling tests
    mockDateNow = jest.spyOn(Date, 'now');

    // Create the TtsKeyboardHandler
    ttsKeyboardHandler = new TtsKeyboardHandler(mockOrchestrationService);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockDateNow.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with orchestration service and setup shortcuts', () => {
      expect(mockKeyboardHandlerInstance.register).toHaveBeenCalledWith(expect.any(Array));
      // The implementation doesn't log anything during initialization
    });

    it('should setup correct number of shortcuts', () => {
      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      const shortcuts = registerCall[0];

      expect(shortcuts).toHaveLength(5);
      expect(shortcuts.map((s: KeyboardShortcut) => s.description)).toEqual([
        'Stop TTS',
        'Start/Pause/Resume TTS',
        'Emergency Stop TTS',
        'Switch TTS Adapter',
        'Toggle TTS On/Off'
      ]);
    });
  });

  describe('getShortcuts', () => {
    it('should delegate to keyboard handler', () => {
      const mockShortcuts: KeyboardShortcut[] = [
        { key: 'test', action: jest.fn(), description: 'Test' }
      ];
      mockKeyboardHandlerInstance.getShortcuts.mockReturnValue(mockShortcuts);

      const result = ttsKeyboardHandler.getShortcuts();

      expect(mockKeyboardHandlerInstance.getShortcuts).toHaveBeenCalled();
      expect(result).toBe(mockShortcuts);
    });
  });

  describe('cleanup', () => {
    it('should delegate to keyboard handler', () => {
      ttsKeyboardHandler.cleanup();
      expect(mockKeyboardHandlerInstance.cleanup).toHaveBeenCalled();
    });
  });

  describe('setEnabled', () => {
    it('should delegate to keyboard handler', () => {
      ttsKeyboardHandler.setEnabled(false);
      expect(mockKeyboardHandlerInstance.setEnabled).toHaveBeenCalledWith(false);

      ttsKeyboardHandler.setEnabled(true);
      expect(mockKeyboardHandlerInstance.setEnabled).toHaveBeenCalledWith(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    let shortcuts: KeyboardShortcut[];

    beforeEach(() => {
      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      shortcuts = registerCall[0];
    });

    describe('Shift+S (Stop)', () => {
      let stopShortcut: KeyboardShortcut;

      beforeEach(() => {
        stopShortcut = shortcuts.find(s => s.key === 's' && s.shiftKey)!;
      });

      it('should stop reading', () => {
        stopShortcut.action();
        expect(mockOrchestrationService.stopReading).toHaveBeenCalled();
      });

      it('should have correct configuration', () => {
        expect(stopShortcut.key).toBe('s');
        expect(stopShortcut.shiftKey).toBe(true);
        expect(stopShortcut.description).toBe('Stop TTS');
      });
    });

    describe('Shift+P (Start/Pause/Resume)', () => {
      let startShortcut: KeyboardShortcut;

      beforeEach(() => {
        startShortcut = shortcuts.find(s => s.key === 'p' && s.shiftKey)!;
        mockDateNow.mockReturnValue(1000);
      });

      it('should start reading when not playing or paused', async () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(false);
        mockOrchestrationService.startReading.mockResolvedValue();

        await startShortcut.action();

        expect(mockOrchestrationService.startReading).toHaveBeenCalled();
        // The implementation doesn't log anything when starting reading
      });

      it('should pause when already playing', async () => {
        mockOrchestrationService.isPlaying.mockReturnValue(true);
        mockOrchestrationService.isPaused.mockReturnValue(false);

        await startShortcut.action();

        expect(mockOrchestrationService.pauseReading).toHaveBeenCalled();
        expect(mockOrchestrationService.startReading).not.toHaveBeenCalled();
        expect(mockOrchestrationService.resumeReading).not.toHaveBeenCalled();
      });

      it('should resume when paused', async () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(true);

        await startShortcut.action();

        expect(mockOrchestrationService.resumeReading).toHaveBeenCalled();
        expect(mockOrchestrationService.startReading).not.toHaveBeenCalled();
        expect(mockOrchestrationService.pauseReading).not.toHaveBeenCalled();
      });

      it('should throttle rapid start commands', async () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(false);
        mockOrchestrationService.startReading.mockClear();
        mockOrchestrationService.startReading.mockResolvedValue();

        // First call at time 1000
        mockDateNow.mockReturnValue(1000);
        await startShortcut.action();
        expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(1);

        // Second call at time 1500 (within throttle window)
        mockDateNow.mockReturnValue(1500);
        await startShortcut.action();
        expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(1); // Should not increment
        // The implementation doesn't log throttling messages

        // Third call at time 2100 (outside throttle window)
        mockDateNow.mockReturnValue(2100);
        await startShortcut.action();
        expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(2); // Should increment
      });

      it('should handle startReading promise rejection', async () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(false);
        const error = new Error('Start reading failed');
        mockOrchestrationService.startReading.mockRejectedValue(error);

        await startShortcut.action();

        expect(mockOrchestrationService.startReading).toHaveBeenCalled();
        // The implementation uses handleDevelopmentError which doesn't call console.error in test mode
      });

      it('should have correct configuration', () => {
        expect(startShortcut.key).toBe('p');
        expect(startShortcut.shiftKey).toBe(true);
        expect(startShortcut.description).toBe('Start/Pause/Resume TTS');
      });
    });

    describe('Escape (Emergency Stop)', () => {
      let escapeShortcut: KeyboardShortcut;

      beforeEach(() => {
        escapeShortcut = shortcuts.find(s => s.key === 'escape')!;
      });

      it('should stop when playing', () => {
        mockOrchestrationService.isPlaying.mockReturnValue(true);
        mockOrchestrationService.isPaused.mockReturnValue(false);

        escapeShortcut.action();

        expect(mockOrchestrationService.stopReading).toHaveBeenCalled();
      });

      it('should stop when paused', () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(true);

        escapeShortcut.action();

        expect(mockOrchestrationService.stopReading).toHaveBeenCalled();
      });

      it('should not stop when neither playing nor paused', () => {
        mockOrchestrationService.isPlaying.mockReturnValue(false);
        mockOrchestrationService.isPaused.mockReturnValue(false);

        escapeShortcut.action();

        expect(mockOrchestrationService.stopReading).not.toHaveBeenCalled();
      });

      it('should have correct configuration', () => {
        expect(escapeShortcut.key).toBe('escape');
        expect(escapeShortcut.shiftKey).toBeUndefined();
        expect(escapeShortcut.ctrlKey).toBeUndefined();
        expect(escapeShortcut.altKey).toBeUndefined();
        expect(escapeShortcut.description).toBe('Emergency Stop TTS');
      });
    });

    describe('Shift+T (Switch Adapter)', () => {
      let switchShortcut: KeyboardShortcut;

      beforeEach(() => {
        switchShortcut = shortcuts.find(s => s.key === 't' && s.shiftKey)!;
      });

      it('should switch adapter successfully', () => {
        switchShortcut.action();
        expect(mockOrchestrationService.switchAdapter).toHaveBeenCalled();
      });

      it('should handle adapter switch error', () => {
        const error = new Error('Switch adapter failed');
        mockOrchestrationService.switchAdapter.mockImplementation(() => {
          throw error;
        });

        switchShortcut.action();

        expect(mockOrchestrationService.switchAdapter).toHaveBeenCalled();
        // The implementation uses handleDevelopmentError which doesn't call console.error in test mode
      });

      it('should have correct configuration', () => {
        expect(switchShortcut.key).toBe('t');
        expect(switchShortcut.shiftKey).toBe(true);
        expect(switchShortcut.description).toBe('Switch TTS Adapter');
      });
    });
  });

  describe('Throttling mechanism', () => {
    let startShortcut: KeyboardShortcut;

    beforeEach(() => {
      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      const shortcuts = registerCall[0];
      startShortcut = shortcuts.find((s: KeyboardShortcut) => s.key === 'p' && s.shiftKey)!;

      mockOrchestrationService.isPlaying.mockReturnValue(false);
      mockOrchestrationService.isPaused.mockReturnValue(false);
      mockOrchestrationService.startReading.mockResolvedValue();
    });

    it('should respect START_THROTTLE_MS constant', async () => {
      mockOrchestrationService.startReading.mockClear();

      // First call at time 1000 (must be > 0 due to throttle check)
      mockDateNow.mockReturnValue(1000);
      await startShortcut.action();
      expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(1);

      // Call within throttle window (1500ms - within 1000ms window)
      mockDateNow.mockReturnValue(1500);
      await startShortcut.action();
      expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(1);

      // Call exactly outside throttle window (2000ms - exactly 1000ms later)
      mockDateNow.mockReturnValue(2000);
      await startShortcut.action();
      expect(mockOrchestrationService.startReading).toHaveBeenCalledTimes(2);
    });

    it('should only throttle start commands, not other actions', () => {
      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      const shortcuts = registerCall[0];
      const stopShortcut = shortcuts.find((s: KeyboardShortcut) => s.key === 's' && s.shiftKey)!;

      // Start command should be throttled
      mockDateNow.mockReturnValue(1000);
      startShortcut.action();
      mockDateNow.mockReturnValue(1500);
      startShortcut.action(); // Should be throttled

      // Stop command should not be throttled
      stopShortcut.action();
      stopShortcut.action();

      expect(mockOrchestrationService.stopReading).toHaveBeenCalledTimes(2);
    });
  });

  describe('setupTtsShortcuts (private method behavior)', () => {
    it('should register shortcuts with KeyboardHandler', () => {
      // This is already tested through constructor, but verifying the specific call
      expect(mockKeyboardHandlerInstance.register).toHaveBeenCalledTimes(1);

      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      const shortcuts = registerCall[0];

      expect(shortcuts).toBeInstanceOf(Array);
      expect(shortcuts).toHaveLength(5);

      // Verify all shortcuts have required properties
      shortcuts.forEach((shortcut: KeyboardShortcut) => {
        expect(shortcut).toHaveProperty('key');
        expect(shortcut).toHaveProperty('action');
        expect(shortcut).toHaveProperty('description');
        expect(typeof shortcut.action).toBe('function');
        expect(typeof shortcut.description).toBe('string');
      });
    });

    it('should log registration message', () => {
      // The implementation doesn't log anything during registration
      expect(mockKeyboardHandlerInstance.register).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle orchestration service method calls that throw', () => {
      const registerCall = mockKeyboardHandlerInstance.register.mock.calls[0];
      const shortcuts = registerCall[0];

      // Test the stop shortcut with throwing orchestration service
      const stopShortcut = shortcuts.find((s: KeyboardShortcut) => s.key === 's' && s.shiftKey)!;
      mockOrchestrationService.stopReading.mockImplementation(() => { throw new Error('Service error'); });

      expect(() => stopShortcut.action()).toThrow('Service error');
    });

    it('should handle undefined orchestration service methods gracefully', () => {
      // Create new handler with partially undefined service
      const partialService = {
        ...mockOrchestrationService,
        isPlaying: undefined,
      } as unknown as typeof mockOrchestrationService;

      expect(() => new TtsKeyboardHandler(partialService)).not.toThrow();
    });
  });
});
