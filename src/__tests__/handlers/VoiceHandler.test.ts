import { VoiceHandler, VoiceHandlerConfig, VoiceChangeCallback } from '@/lib/handlers/VoiceHandler';
import { IPlaybackAdapter, VoiceInfo, IVoiceProvider } from '@/preferences/types';

describe('VoiceHandler', () => {
  let mockVoiceProvider: jest.Mocked<IVoiceProvider>;
  let mockAdapter: jest.Mocked<IPlaybackAdapter>;
  let mockCallbacks: jest.Mocked<VoiceChangeCallback>;
  let voiceHandler: VoiceHandler;

  const mockVoices: VoiceInfo[] = [
    { id: 'voice1', name: 'Alice', language: 'en-US', gender: 'female' },
    { id: 'voice2', name: 'Bob', language: 'en-US', gender: 'male' },
    { id: 'voice3', name: 'Charlie', language: 'en-GB', gender: 'male' },
  ];

  beforeEach(() => {
    mockVoiceProvider = {
      getVoices: jest.fn(),
      setVoice: jest.fn(),
      getVoicesByGender: jest.fn(),
      getCurrentVoiceGender: jest.fn(),
    };

    mockAdapter = {
      play: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      voices: mockVoiceProvider,
    };

    mockCallbacks = {
      onVoiceChanged: jest.fn(),
      onVoiceError: jest.fn(),
      onVoicesLoaded: jest.fn(),
    };

    const config: VoiceHandlerConfig = {
      adapter: mockAdapter,
      callbacks: mockCallbacks,
    };

    voiceHandler = new VoiceHandler(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with adapter and callbacks', () => {
      expect(voiceHandler).toBeInstanceOf(VoiceHandler);
      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
      expect(voiceHandler.getLoadedVoices()).toEqual([]);
    });

    it('should initialize with empty callbacks when not provided', () => {
      const config: VoiceHandlerConfig = { adapter: mockAdapter };
      const handler = new VoiceHandler(config);

      expect(handler).toBeInstanceOf(VoiceHandler);
      expect(handler.getCurrentVoiceId()).toBeNull();
    });
  });

  describe('loadVoices', () => {
    it('should load voices successfully and auto-select first voice', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      const result = await voiceHandler.loadVoices();

      expect(result).toEqual(mockVoices);
      expect(mockVoiceProvider.getVoices).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onVoicesLoaded).toHaveBeenCalledWith(mockVoices);
      expect(mockVoiceProvider.setVoice).toHaveBeenCalledWith('voice1');
      expect(mockCallbacks.onVoiceChanged).toHaveBeenCalledWith('voice1', mockVoices[0]);
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
    });

    it('should load voices successfully without auto-selecting when voice already set', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      // First load to set a voice
      await voiceHandler.loadVoices();
      jest.clearAllMocks();

      // Second load should not auto-select
      const result = await voiceHandler.loadVoices();

      expect(result).toEqual(mockVoices);
      expect(mockCallbacks.onVoicesLoaded).toHaveBeenCalledWith(mockVoices);
      expect(mockVoiceProvider.setVoice).not.toHaveBeenCalled();
    });

    it('should handle null voices from adapter', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(null as any);

      await expect(voiceHandler.loadVoices()).rejects.toThrow('No voices available from adapter');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('No voices available from adapter', 'unknown');
    });

    it('should handle adapter getVoices throwing error', async () => {
      const error = new Error('Network error');
      mockVoiceProvider.getVoices.mockRejectedValue(error);

      await expect(voiceHandler.loadVoices()).rejects.toThrow('Network error');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Network error', 'unknown');
    });

    it('should handle non-Error exceptions', async () => {
      mockVoiceProvider.getVoices.mockRejectedValue('String error');

      await expect(voiceHandler.loadVoices()).rejects.toBe('String error');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Failed to load voices', 'unknown');
    });

    it('should handle empty voices array', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue([]);

      const result = await voiceHandler.loadVoices();

      expect(result).toEqual([]);
      expect(mockCallbacks.onVoicesLoaded).toHaveBeenCalledWith([]);
      expect(mockVoiceProvider.setVoice).not.toHaveBeenCalled();
      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
    });
  });

  describe('setVoice', () => {
    beforeEach(async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();
      await voiceHandler.loadVoices();
      jest.clearAllMocks();
    });

    it('should set voice successfully with voice info', async () => {
      await voiceHandler.setVoice('voice2');

      expect(mockVoiceProvider.setVoice).toHaveBeenCalledWith('voice2');
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice2');
      expect(mockCallbacks.onVoiceChanged).toHaveBeenCalledWith('voice2', mockVoices[1]);
    });

    it('should set voice successfully without voice info when not found', async () => {
      await voiceHandler.setVoice('unknown-voice');

      expect(mockVoiceProvider.setVoice).toHaveBeenCalledWith('unknown-voice');
      expect(voiceHandler.getCurrentVoiceId()).toBe('unknown-voice');
      expect(mockCallbacks.onVoiceChanged).toHaveBeenCalledWith('unknown-voice', undefined);
    });

    it('should handle missing setVoice method on adapter', async () => {
      mockAdapter.voices = undefined;

      await expect(voiceHandler.setVoice('voice2')).rejects.toThrow('Voice setting not supported by current adapter');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Voice setting not supported by current adapter', 'voice2');
    });

    it('should handle setVoice throwing error', async () => {
      const error = new Error('Voice not found');
      mockVoiceProvider.setVoice.mockRejectedValue(error);

      await expect(voiceHandler.setVoice('voice2')).rejects.toThrow('Voice not found');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Voice not found', 'voice2');
    });

    it('should handle non-Error exceptions in setVoice', async () => {
      mockVoiceProvider.setVoice.mockRejectedValue('String error');

      await expect(voiceHandler.setVoice('voice2')).rejects.toBe('String error');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Failed to set voice', 'voice2');
    });
  });

  describe('getVoicesByGender', () => {
    beforeEach(async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();
      await voiceHandler.loadVoices();
      jest.clearAllMocks();
    });

    it('should use adapter method when available', async () => {
      const femaleVoices = [mockVoices[0]];
      (mockVoiceProvider.getVoicesByGender as jest.Mock).mockResolvedValue(femaleVoices);

      const result = await voiceHandler.getVoicesByGender('female');

      expect(result).toEqual(femaleVoices);
      expect(mockVoiceProvider.getVoicesByGender).toHaveBeenCalledWith('female');
    });

    it('should fallback to filtering loaded voices when adapter method unavailable', async () => {
      mockVoiceProvider.getVoicesByGender = undefined;

      const result = await voiceHandler.getVoicesByGender('male');

      expect(result).toEqual([mockVoices[1], mockVoices[2]]);
    });

    it('should handle adapter method throwing error', async () => {
      const error = new Error('Gender filter error');
      (mockVoiceProvider.getVoicesByGender as jest.Mock).mockRejectedValue(error);

      await expect(voiceHandler.getVoicesByGender('female')).rejects.toThrow('Gender filter error');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Gender filter error', 'filter');
    });

    it('should handle non-Error exceptions in getVoicesByGender', async () => {
      (mockVoiceProvider.getVoicesByGender as jest.Mock).mockRejectedValue('String error');

      await expect(voiceHandler.getVoicesByGender('female')).rejects.toBe('String error');
      expect(mockCallbacks.onVoiceError).toHaveBeenCalledWith('Failed to get female voices', 'filter');
    });
  });

  describe('getCurrentVoiceGender', () => {
    beforeEach(async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();
      await voiceHandler.loadVoices();
      jest.clearAllMocks();
    });

    it('should use adapter method when available', async () => {
      (mockVoiceProvider.getCurrentVoiceGender as jest.Mock).mockResolvedValue('female');

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBe('female');
      expect(mockVoiceProvider.getCurrentVoiceGender).toHaveBeenCalledTimes(1);
    });

    it('should fallback to finding from loaded voices', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBe('female'); // voice1 is female
    });

    it('should return null when no current voice', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      // Create new handler without auto-selecting voice
      const newConfig: VoiceHandlerConfig = { adapter: mockAdapter };
      const newHandler = new VoiceHandler(newConfig);

      const result = await newHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
    });

    it('should return null when current voice not found in loaded voices', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      // Set a voice that's not in the loaded voices
      mockVoiceProvider.setVoice.mockResolvedValue();
      await voiceHandler.setVoice('unknown-voice');

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
    });

    it('should handle adapter method throwing error', async () => {
      const error = new Error('Gender retrieval error');
      (mockVoiceProvider.getCurrentVoiceGender as jest.Mock).mockRejectedValue(error);

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
      // Should log warning but not throw
    });
  });

  describe('getLoadedVoices', () => {
    it('should return empty array initially', () => {
      const result = voiceHandler.getLoadedVoices();
      expect(result).toEqual([]);
    });

    it('should return copy of loaded voices', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      const result = voiceHandler.getLoadedVoices();

      expect(result).toEqual(mockVoices);
      expect(result).not.toBe(mockVoices); // Should be a copy
    });
  });

  describe('getCurrentVoiceId', () => {
    it('should return null initially', () => {
      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
    });

    it('should return current voice ID after setting', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
    });
  });

  describe('getCurrentVoiceInfo', () => {
    it('should return null when no current voice', () => {
      expect(voiceHandler.getCurrentVoiceInfo()).toBeNull();
    });

    it('should return current voice info', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      const result = voiceHandler.getCurrentVoiceInfo();

      expect(result).toEqual(mockVoices[0]);
    });

    it('should return null when current voice not found in loaded voices', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      await voiceHandler.setVoice('unknown-voice');

      const result = voiceHandler.getCurrentVoiceInfo();
      expect(result).toBeNull();
    });
  });

  describe('updateAdapter', () => {
    it('should update adapter and reset state', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
      expect(voiceHandler.getLoadedVoices()).toEqual(mockVoices);

      const newAdapter: IPlaybackAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        voices: {
          getVoices: jest.fn(),
          setVoice: jest.fn(),
        },
      };

      voiceHandler.updateAdapter(newAdapter);

      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
      expect(voiceHandler.getLoadedVoices()).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should clear all state and callbacks', async () => {
      mockVoiceProvider.getVoices.mockResolvedValue(mockVoices);
      mockVoiceProvider.setVoice.mockResolvedValue();

      await voiceHandler.loadVoices();
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
      expect(voiceHandler.getLoadedVoices()).toEqual(mockVoices);

      voiceHandler.cleanup();

      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
      expect(voiceHandler.getLoadedVoices()).toEqual([]);
    });
  });

  describe('getCurrentVoiceGender', () => {
    beforeEach(async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);
      await voiceHandler.loadVoices();
      jest.clearAllMocks();
    });

    it('should use adapter method when available', async () => {
      (mockVoiceProvider.getCurrentVoiceGender as jest.Mock).mockResolvedValue('female');

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBe('female');
      expect(mockVoiceProvider.getCurrentVoiceGender).toHaveBeenCalledTimes(1);
    });

    it('should fallback to finding from loaded voices', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBe('female'); // voice1 is female
    });

    it('should return null when no current voice', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      // Create new handler without auto-selecting voice
      const newConfig: VoiceHandlerConfig = { adapter: mockAdapter };
      const newHandler = new VoiceHandler(newConfig);

      const result = await newHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
    });

    it('should return null when current voice not found in loaded voices', async () => {
      mockVoiceProvider.getCurrentVoiceGender = undefined;

      // Set a voice that's not in the loaded voices
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);
      await voiceHandler.setVoice('unknown-voice');

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
    });

    it('should handle adapter method throwing error', async () => {
      const error = new Error('Gender retrieval error');
      (mockVoiceProvider.getCurrentVoiceGender as jest.Mock).mockRejectedValue(error);

      const result = await voiceHandler.getCurrentVoiceGender();

      expect(result).toBeNull();
      // Should log warning but not throw
    });
  });

  describe('getLoadedVoices', () => {
    it('should return empty array initially', () => {
      const result = voiceHandler.getLoadedVoices();
      expect(result).toEqual([]);
    });

    it('should return copy of loaded voices', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();
      const result = voiceHandler.getLoadedVoices();

      expect(result).toEqual(mockVoices);
      expect(result).not.toBe(mockVoices); // Should be a copy
    });
  });

  describe('getCurrentVoiceId', () => {
    it('should return null initially', () => {
      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
    });

    it('should return current voice ID after setting', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
    });
  });

  describe('getCurrentVoiceInfo', () => {
    it('should return null when no current voice', () => {
      expect(voiceHandler.getCurrentVoiceInfo()).toBeNull();
    });

    it('should return current voice info', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();
      const result = voiceHandler.getCurrentVoiceInfo();

      expect(result).toEqual(mockVoices[0]);
    });

    it('should return null when current voice not found in loaded voices', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();
      await voiceHandler.setVoice('unknown-voice');

      const result = voiceHandler.getCurrentVoiceInfo();
      expect(result).toBeNull();
    });
  });

  describe('updateAdapter', () => {
    it('should update adapter and reset state', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();
      expect(voiceHandler.getCurrentVoiceId()).toBe('voice1');
      expect(voiceHandler.getLoadedVoices()).toEqual(mockVoices);

      const newAdapter: IPlaybackAdapter = {
        play: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        voices: {
          getVoices: jest.fn(),
          setVoice: jest.fn(),
        },
      };

      voiceHandler.updateAdapter(newAdapter);

      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
      expect(voiceHandler.getLoadedVoices()).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should clear all state and callbacks', async () => {
      (mockVoiceProvider.getVoices as jest.Mock).mockResolvedValue(mockVoices);
      (mockVoiceProvider.setVoice as jest.Mock).mockResolvedValue(undefined);

      await voiceHandler.loadVoices();

      voiceHandler.cleanup();

      expect(voiceHandler.getCurrentVoiceId()).toBeNull();
      expect(voiceHandler.getLoadedVoices()).toEqual([]);
    });
  });
});
