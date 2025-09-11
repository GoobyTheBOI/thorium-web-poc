import ttsReducer, {
  TtsReducerState,
  // Adapter Actions
  setSelectedAdapterType,
  setAvailableAdapters,
  setIsRecreatingServices,
  // Voice Actions
  setVoices,
  setSelectedVoice,
  setIsLoadingVoices,
  setVoicesError,
  // TTS Actions
  setIsPlaying,
  setIsPaused,
  setIsGenerating,
  setError,
  // Complex Actions
  startVoiceLoading,
  finishVoiceLoading,
  voiceLoadingFailed,
  startAdapterSwitch,
  finishAdapterSwitch,
  adapterSwitchFailed,
  // Reset Actions
  resetTtsState,
  resetVoiceState,
} from '@/lib/ttsReducer';
import { AdapterType, AdapterInfo } from '@/lib/factories/AdapterFactory';
import { VoiceInfo } from '@/preferences/types';

// Mock data for testing
const mockAdapterInfo: AdapterInfo = {
  key: 'azure',
  name: 'Azure Speech',
  isImplemented: true,
};

const mockAdapterInfos: AdapterInfo[] = [
  {
    key: 'azure',
    name: 'Azure Speech',
    isImplemented: true,
  },
  {
    key: 'elevenlabs',
    name: 'ElevenLabs',
    isImplemented: true,
  },
];

const mockVoiceInfo: VoiceInfo = {
  id: 'voice-1',
  name: 'Test Voice',
  language: 'en-US',
  gender: 'female',
};

const mockVoices: VoiceInfo[] = [
  {
    id: 'voice-1',
    name: 'Test Voice 1',
    language: 'en-US',
    gender: 'female',
  },
  {
    id: 'voice-2',
    name: 'Test Voice 2',
    language: 'en-UK',
    gender: 'male',
  },
  {
    id: 'voice-3',
    name: 'Test Voice 3',
    language: 'fr-FR',
    gender: 'neutral',
  },
];

const initialState: TtsReducerState = {
  // Adapter State
  selectedAdapterType: 'elevenlabs',
  availableAdapters: [],
  isRecreatingServices: false,

  // Voice State
  voices: [],
  selectedVoice: null,
  isLoadingVoices: true,
  voicesError: null,

  // TTS State
  isPlaying: false,
  isPaused: false,
  isGenerating: false,
  error: null,
  isEnabled: true,
};

describe('ttsReducer', () => {
  describe('Initial State', () => {
    it('should return the correct initial state', () => {
      const state = ttsReducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });

    it('should have correct default adapter type', () => {
      const state = ttsReducer(undefined, { type: 'unknown' });
      expect(state.selectedAdapterType).toBe('elevenlabs');
    });

    it('should have correct default loading state', () => {
      const state = ttsReducer(undefined, { type: 'unknown' });
      expect(state.isLoadingVoices).toBe(true);
      expect(state.isRecreatingServices).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isGenerating).toBe(false);
    });

    it('should have correct default error states', () => {
      const state = ttsReducer(undefined, { type: 'unknown' });
      expect(state.voicesError).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should have correct default arrays and selections', () => {
      const state = ttsReducer(undefined, { type: 'unknown' });
      expect(state.availableAdapters).toEqual([]);
      expect(state.voices).toEqual([]);
      expect(state.selectedVoice).toBeNull();
    });
  });

  describe('Adapter Actions', () => {
    describe('setSelectedAdapterType', () => {
      it('should set azure adapter type', () => {
        const state = ttsReducer(initialState, setSelectedAdapterType('azure'));
        expect(state.selectedAdapterType).toBe('azure');
        expect(state).toEqual({
          ...initialState,
          selectedAdapterType: 'azure',
        });
      });

      it('should set elevenlabs adapter type', () => {
        const stateWithAzure = { ...initialState, selectedAdapterType: 'azure' as AdapterType };
        const state = ttsReducer(stateWithAzure, setSelectedAdapterType('elevenlabs'));
        expect(state.selectedAdapterType).toBe('elevenlabs');
      });

      it('should not affect other state properties', () => {
        const modifiedInitialState = {
          ...initialState,
          isPlaying: true,
          voices: mockVoices,
          selectedVoice: 'voice-1',
        };
        const state = ttsReducer(modifiedInitialState, setSelectedAdapterType('azure'));
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.isPlaying).toBe(true);
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-1');
      });
    });

    describe('setAvailableAdapters', () => {
      it('should set empty adapters array', () => {
        const state = ttsReducer(initialState, setAvailableAdapters([]));
        expect(state.availableAdapters).toEqual([]);
      });

      it('should set single adapter', () => {
        const state = ttsReducer(initialState, setAvailableAdapters([mockAdapterInfo]));
        expect(state.availableAdapters).toEqual([mockAdapterInfo]);
        expect(state.availableAdapters).toHaveLength(1);
      });

      it('should set multiple adapters', () => {
        const state = ttsReducer(initialState, setAvailableAdapters(mockAdapterInfos));
        expect(state.availableAdapters).toEqual(mockAdapterInfos);
        expect(state.availableAdapters).toHaveLength(2);
      });

      it('should replace existing adapters', () => {
        const stateWithAdapters = { ...initialState, availableAdapters: mockAdapterInfos };
        const newAdapters = [mockAdapterInfo];
        const state = ttsReducer(stateWithAdapters, setAvailableAdapters(newAdapters));
        expect(state.availableAdapters).toEqual(newAdapters);
        expect(state.availableAdapters).toHaveLength(1);
      });

      it('should not affect other state properties', () => {
        const modifiedState = { ...initialState, isPlaying: true, selectedVoice: 'voice-1' };
        const state = ttsReducer(modifiedState, setAvailableAdapters(mockAdapterInfos));
        expect(state.availableAdapters).toEqual(mockAdapterInfos);
        expect(state.isPlaying).toBe(true);
        expect(state.selectedVoice).toBe('voice-1');
      });
    });

    describe('setIsRecreatingServices', () => {
      it('should set isRecreatingServices to true', () => {
        const state = ttsReducer(initialState, setIsRecreatingServices(true));
        expect(state.isRecreatingServices).toBe(true);
      });

      it('should set isRecreatingServices to false', () => {
        const stateWithRecreating = { ...initialState, isRecreatingServices: true };
        const state = ttsReducer(stateWithRecreating, setIsRecreatingServices(false));
        expect(state.isRecreatingServices).toBe(false);
      });

      it('should not affect other state properties', () => {
        const modifiedState = { ...initialState, isPlaying: true, selectedAdapterType: 'azure' as AdapterType };
        const state = ttsReducer(modifiedState, setIsRecreatingServices(true));
        expect(state.isRecreatingServices).toBe(true);
        expect(state.isPlaying).toBe(true);
        expect(state.selectedAdapterType).toBe('azure');
      });
    });
  });

  describe('Voice Actions', () => {
    describe('setVoices', () => {
      it('should set empty voices array', () => {
        const state = ttsReducer(initialState, setVoices([]));
        expect(state.voices).toEqual([]);
      });

      it('should set single voice', () => {
        const state = ttsReducer(initialState, setVoices([mockVoiceInfo]));
        expect(state.voices).toEqual([mockVoiceInfo]);
        expect(state.voices).toHaveLength(1);
      });

      it('should set multiple voices', () => {
        const state = ttsReducer(initialState, setVoices(mockVoices));
        expect(state.voices).toEqual(mockVoices);
        expect(state.voices).toHaveLength(3);
      });

      it('should replace existing voices', () => {
        const stateWithVoices = { ...initialState, voices: mockVoices };
        const newVoices = [mockVoiceInfo];
        const state = ttsReducer(stateWithVoices, setVoices(newVoices));
        expect(state.voices).toEqual(newVoices);
        expect(state.voices).toHaveLength(1);
      });
    });

    describe('setSelectedVoice', () => {
      it('should set selected voice to string value', () => {
        const state = ttsReducer(initialState, setSelectedVoice('voice-1'));
        expect(state.selectedVoice).toBe('voice-1');
      });

      it('should set selected voice to null', () => {
        const stateWithVoice = { ...initialState, selectedVoice: 'voice-1' };
        const state = ttsReducer(stateWithVoice, setSelectedVoice(null));
        expect(state.selectedVoice).toBeNull();
      });

      it('should replace existing selected voice', () => {
        const stateWithVoice = { ...initialState, selectedVoice: 'voice-1' };
        const state = ttsReducer(stateWithVoice, setSelectedVoice('voice-2'));
        expect(state.selectedVoice).toBe('voice-2');
      });
    });

    describe('setIsLoadingVoices', () => {
      it('should set isLoadingVoices to false', () => {
        const state = ttsReducer(initialState, setIsLoadingVoices(false));
        expect(state.isLoadingVoices).toBe(false);
      });

      it('should set isLoadingVoices to true', () => {
        const stateWithLoading = { ...initialState, isLoadingVoices: false };
        const state = ttsReducer(stateWithLoading, setIsLoadingVoices(true));
        expect(state.isLoadingVoices).toBe(true);
      });
    });

    describe('setVoicesError', () => {
      it('should set voices error to string', () => {
        const errorMessage = 'Failed to load voices';
        const state = ttsReducer(initialState, setVoicesError(errorMessage));
        expect(state.voicesError).toBe(errorMessage);
      });

      it('should set voices error to null', () => {
        const stateWithError = { ...initialState, voicesError: 'Previous error' };
        const state = ttsReducer(stateWithError, setVoicesError(null));
        expect(state.voicesError).toBeNull();
      });

      it('should replace existing error', () => {
        const stateWithError = { ...initialState, voicesError: 'Previous error' };
        const newError = 'New error message';
        const state = ttsReducer(stateWithError, setVoicesError(newError));
        expect(state.voicesError).toBe(newError);
      });
    });
  });

  describe('TTS Actions', () => {
    describe('setIsPlaying', () => {
      it('should set isPlaying to true', () => {
        const state = ttsReducer(initialState, setIsPlaying(true));
        expect(state.isPlaying).toBe(true);
      });

      it('should set isPlaying to false', () => {
        const stateWithPlaying = { ...initialState, isPlaying: true };
        const state = ttsReducer(stateWithPlaying, setIsPlaying(false));
        expect(state.isPlaying).toBe(false);
      });
    });

    describe('setIsPaused', () => {
      it('should set isPaused to true', () => {
        const state = ttsReducer(initialState, setIsPaused(true));
        expect(state.isPaused).toBe(true);
      });

      it('should set isPaused to false', () => {
        const stateWithPaused = { ...initialState, isPaused: true };
        const state = ttsReducer(stateWithPaused, setIsPaused(false));
        expect(state.isPaused).toBe(false);
      });
    });

    describe('setIsGenerating', () => {
      it('should set isGenerating to true', () => {
        const state = ttsReducer(initialState, setIsGenerating(true));
        expect(state.isGenerating).toBe(true);
      });

      it('should set isGenerating to false', () => {
        const stateWithGenerating = { ...initialState, isGenerating: true };
        const state = ttsReducer(stateWithGenerating, setIsGenerating(false));
        expect(state.isGenerating).toBe(false);
      });
    });

    describe('setError', () => {
      it('should set error to string', () => {
        const errorMessage = 'TTS generation failed';
        const state = ttsReducer(initialState, setError(errorMessage));
        expect(state.error).toBe(errorMessage);
      });

      it('should set error to null', () => {
        const stateWithError = { ...initialState, error: 'Previous error' };
        const state = ttsReducer(stateWithError, setError(null));
        expect(state.error).toBeNull();
      });

      it('should replace existing error', () => {
        const stateWithError = { ...initialState, error: 'Previous error' };
        const newError = 'New error message';
        const state = ttsReducer(stateWithError, setError(newError));
        expect(state.error).toBe(newError);
      });
    });
  });

  describe('Complex Actions', () => {
    describe('startVoiceLoading', () => {
      it('should set loading state correctly', () => {
        const stateWithError = {
          ...initialState,
          isLoadingVoices: false,
          voicesError: 'Previous error',
        };
        const state = ttsReducer(stateWithError, startVoiceLoading());
        expect(state.isLoadingVoices).toBe(true);
        expect(state.voicesError).toBeNull();
      });

      it('should not affect other state properties', () => {
        const modifiedState = {
          ...initialState,
          isPlaying: true,
          selectedVoice: 'voice-1',
          voices: mockVoices,
        };
        const state = ttsReducer(modifiedState, startVoiceLoading());
        expect(state.isLoadingVoices).toBe(true);
        expect(state.voicesError).toBeNull();
        expect(state.isPlaying).toBe(true);
        expect(state.selectedVoice).toBe('voice-1');
        expect(state.voices).toEqual(mockVoices);
      });
    });

    describe('finishVoiceLoading', () => {
      it('should finish loading with voices only', () => {
        const stateWithLoading = {
          ...initialState,
          isLoadingVoices: true,
          voicesError: 'Previous error',
        };
        const state = ttsReducer(stateWithLoading, finishVoiceLoading({ voices: mockVoices }));
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBeNull();
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voicesError).toBeNull();
      });

      it('should finish loading with voices and selected voice', () => {
        const stateWithLoading = {
          ...initialState,
          isLoadingVoices: true,
          voicesError: 'Previous error',
        };
        const state = ttsReducer(stateWithLoading, finishVoiceLoading({
          voices: mockVoices,
          selectedVoice: 'voice-2',
        }));
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-2');
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voicesError).toBeNull();
      });

      it('should handle selectedVoice as null explicitly', () => {
        const stateWithVoice = {
          ...initialState,
          selectedVoice: 'voice-1',
          isLoadingVoices: true,
        };
        const state = ttsReducer(stateWithVoice, finishVoiceLoading({
          voices: mockVoices,
          selectedVoice: null,
        }));
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBeNull();
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voicesError).toBeNull();
      });

      it('should handle empty voices array', () => {
        const state = ttsReducer(initialState, finishVoiceLoading({ voices: [] }));
        expect(state.voices).toEqual([]);
        expect(state.selectedVoice).toBeNull();
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voicesError).toBeNull();
      });
    });

    describe('voiceLoadingFailed', () => {
      it('should set error and stop loading', () => {
        const stateWithLoading = {
          ...initialState,
          isLoadingVoices: true,
          voicesError: null,
        };
        const errorMessage = 'Failed to fetch voices';
        const state = ttsReducer(stateWithLoading, voiceLoadingFailed(errorMessage));
        expect(state.voicesError).toBe(errorMessage);
        expect(state.isLoadingVoices).toBe(false);
      });

      it('should not affect other state properties', () => {
        const modifiedState = {
          ...initialState,
          isLoadingVoices: true,
          voices: mockVoices,
          selectedVoice: 'voice-1',
          isPlaying: true,
        };
        const errorMessage = 'Network error';
        const state = ttsReducer(modifiedState, voiceLoadingFailed(errorMessage));
        expect(state.voicesError).toBe(errorMessage);
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-1');
        expect(state.isPlaying).toBe(true);
      });
    });

    describe('startAdapterSwitch', () => {
      it('should start adapter switch to azure', () => {
        const stateWithError = {
          ...initialState,
          isRecreatingServices: false,
          selectedAdapterType: 'elevenlabs' as AdapterType,
          voicesError: 'Previous error',
        };
        const state = ttsReducer(stateWithError, startAdapterSwitch('azure'));
        expect(state.isRecreatingServices).toBe(true);
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.voicesError).toBeNull();
      });

      it('should start adapter switch to elevenlabs', () => {
        const stateWithAzure = {
          ...initialState,
          selectedAdapterType: 'azure' as AdapterType,
          isRecreatingServices: false,
        };
        const state = ttsReducer(stateWithAzure, startAdapterSwitch('elevenlabs'));
        expect(state.isRecreatingServices).toBe(true);
        expect(state.selectedAdapterType).toBe('elevenlabs');
        expect(state.voicesError).toBeNull();
      });

      it('should not affect other state properties', () => {
        const modifiedState = {
          ...initialState,
          voices: mockVoices,
          selectedVoice: 'voice-1',
          isPlaying: true,
        };
        const state = ttsReducer(modifiedState, startAdapterSwitch('azure'));
        expect(state.isRecreatingServices).toBe(true);
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.voicesError).toBeNull();
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-1');
        expect(state.isPlaying).toBe(true);
      });
    });

    describe('finishAdapterSwitch', () => {
      it('should finish adapter switch', () => {
        const stateWithSwitching = {
          ...initialState,
          isRecreatingServices: true,
        };
        const state = ttsReducer(stateWithSwitching, finishAdapterSwitch());
        expect(state.isRecreatingServices).toBe(false);
      });

      it('should not affect other state properties', () => {
        const modifiedState = {
          ...initialState,
          isRecreatingServices: true,
          selectedAdapterType: 'azure' as AdapterType,
          voices: mockVoices,
          selectedVoice: 'voice-1',
        };
        const state = ttsReducer(modifiedState, finishAdapterSwitch());
        expect(state.isRecreatingServices).toBe(false);
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-1');
      });
    });

    describe('adapterSwitchFailed', () => {
      it('should handle adapter switch failure', () => {
        const stateWithSwitching = {
          ...initialState,
          isRecreatingServices: true,
          voicesError: null,
        };
        const errorMessage = 'Failed to switch adapter';
        const state = ttsReducer(stateWithSwitching, adapterSwitchFailed(errorMessage));
        expect(state.isRecreatingServices).toBe(false);
        expect(state.voicesError).toBe(errorMessage);
      });

      it('should not affect other state properties', () => {
        const modifiedState = {
          ...initialState,
          isRecreatingServices: true,
          selectedAdapterType: 'azure' as AdapterType,
          voices: mockVoices,
          isPlaying: true,
        };
        const errorMessage = 'Adapter initialization failed';
        const state = ttsReducer(modifiedState, adapterSwitchFailed(errorMessage));
        expect(state.isRecreatingServices).toBe(false);
        expect(state.voicesError).toBe(errorMessage);
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.voices).toEqual(mockVoices);
        expect(state.isPlaying).toBe(true);
      });
    });
  });

  describe('Reset Actions', () => {
    describe('resetTtsState', () => {
      it('should reset all TTS state properties', () => {
        const stateWithTts = {
          ...initialState,
          isPlaying: true,
          isPaused: true,
          isGenerating: true,
          error: 'Some error',
        };
        const state = ttsReducer(stateWithTts, resetTtsState());
        expect(state.isPlaying).toBe(false);
        expect(state.isPaused).toBe(false);
        expect(state.isGenerating).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should not affect non-TTS state properties', () => {
        const modifiedState = {
          ...initialState,
          isPlaying: true,
          isPaused: true,
          isGenerating: true,
          error: 'TTS error',
          selectedAdapterType: 'azure' as AdapterType,
          voices: mockVoices,
          selectedVoice: 'voice-1',
          isLoadingVoices: false,
          voicesError: 'Voice error',
          availableAdapters: mockAdapterInfos,
          isRecreatingServices: true,
        };
        const state = ttsReducer(modifiedState, resetTtsState());
        expect(state.isPlaying).toBe(false);
        expect(state.isPaused).toBe(false);
        expect(state.isGenerating).toBe(false);
        expect(state.error).toBeNull();
        // Non-TTS properties should remain unchanged
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.voices).toEqual(mockVoices);
        expect(state.selectedVoice).toBe('voice-1');
        expect(state.isLoadingVoices).toBe(false);
        expect(state.voicesError).toBe('Voice error');
        expect(state.availableAdapters).toEqual(mockAdapterInfos);
        expect(state.isRecreatingServices).toBe(true);
      });
    });

    describe('resetVoiceState', () => {
      it('should reset all voice state properties', () => {
        const stateWithVoices = {
          ...initialState,
          voices: mockVoices,
          selectedVoice: 'voice-1',
          isLoadingVoices: false,
          voicesError: 'Some error',
        };
        const state = ttsReducer(stateWithVoices, resetVoiceState());
        expect(state.voices).toEqual([]);
        expect(state.selectedVoice).toBeNull();
        expect(state.isLoadingVoices).toBe(true);
        expect(state.voicesError).toBeNull();
      });

      it('should not affect non-voice state properties', () => {
        const modifiedState = {
          ...initialState,
          voices: mockVoices,
          selectedVoice: 'voice-1',
          isLoadingVoices: false,
          voicesError: 'Voice error',
          selectedAdapterType: 'azure' as AdapterType,
          availableAdapters: mockAdapterInfos,
          isRecreatingServices: true,
          isPlaying: true,
          isPaused: true,
          isGenerating: true,
          error: 'TTS error',
        };
        const state = ttsReducer(modifiedState, resetVoiceState());
        expect(state.voices).toEqual([]);
        expect(state.selectedVoice).toBeNull();
        expect(state.isLoadingVoices).toBe(true);
        expect(state.voicesError).toBeNull();
        // Non-voice properties should remain unchanged
        expect(state.selectedAdapterType).toBe('azure');
        expect(state.availableAdapters).toEqual(mockAdapterInfos);
        expect(state.isRecreatingServices).toBe(true);
        expect(state.isPlaying).toBe(true);
        expect(state.isPaused).toBe(true);
        expect(state.isGenerating).toBe(true);
        expect(state.error).toBe('TTS error');
      });
    });
  });

  describe('Action Combinations', () => {
    it('should handle multiple actions in sequence', () => {
      let state = ttsReducer(initialState, setSelectedAdapterType('azure'));
      state = ttsReducer(state, startVoiceLoading());
      state = ttsReducer(state, finishVoiceLoading({ voices: mockVoices, selectedVoice: 'voice-1' }));
      state = ttsReducer(state, setIsPlaying(true));

      expect(state.selectedAdapterType).toBe('azure');
      expect(state.isLoadingVoices).toBe(false);
      expect(state.voices).toEqual(mockVoices);
      expect(state.selectedVoice).toBe('voice-1');
      expect(state.isPlaying).toBe(true);
      expect(state.voicesError).toBeNull();
    });

    it('should handle error scenarios correctly', () => {
      let state = ttsReducer(initialState, startAdapterSwitch('azure'));
      state = ttsReducer(state, adapterSwitchFailed('Network error'));
      state = ttsReducer(state, startVoiceLoading());
      state = ttsReducer(state, voiceLoadingFailed('Voice loading failed'));

      expect(state.selectedAdapterType).toBe('azure');
      expect(state.isRecreatingServices).toBe(false);
      expect(state.isLoadingVoices).toBe(false);
      expect(state.voicesError).toBe('Voice loading failed');
    });

    it('should handle reset operations correctly', () => {
      let state: TtsReducerState = {
        ...initialState,
        selectedAdapterType: 'azure' as AdapterType,
        voices: mockVoices,
        selectedVoice: 'voice-1',
        isLoadingVoices: false,
        isPlaying: true,
        isPaused: true,
        error: 'Some error',
      };

      state = ttsReducer(state, resetTtsState());
      state = ttsReducer(state, resetVoiceState());

      expect(state.selectedAdapterType).toBe('azure'); // Should not be reset
      expect(state.voices).toEqual([]);
      expect(state.selectedVoice).toBeNull();
      expect(state.isLoadingVoices).toBe(true);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.error).toBeNull();
      expect(state.voicesError).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined payload gracefully for optional fields', () => {
      const state = ttsReducer(initialState, finishVoiceLoading({
        voices: mockVoices,
        selectedVoice: undefined,
      }));
      expect(state.selectedVoice).toBeNull();
      expect(state.voices).toEqual(mockVoices);
    });

    it('should handle empty strings in error messages', () => {
      const state = ttsReducer(initialState, setError(''));
      expect(state.error).toBe('');
    });

    it('should handle empty strings in voice errors', () => {
      const state = ttsReducer(initialState, setVoicesError(''));
      expect(state.voicesError).toBe('');
    });

    it('should handle setting same adapter type multiple times', () => {
      let state = ttsReducer(initialState, setSelectedAdapterType('azure'));
      state = ttsReducer(state, setSelectedAdapterType('azure'));
      state = ttsReducer(state, setSelectedAdapterType('azure'));
      expect(state.selectedAdapterType).toBe('azure');
    });

    it('should handle boolean toggles correctly', () => {
      let state = ttsReducer(initialState, setIsPlaying(true));
      state = ttsReducer(state, setIsPlaying(false));
      state = ttsReducer(state, setIsPlaying(true));
      expect(state.isPlaying).toBe(true);
    });
  });
});
