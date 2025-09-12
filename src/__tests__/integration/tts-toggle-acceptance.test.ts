import ttsReducer, { TtsReducerState, toggleTts, setIsEnabled, setIsPlaying, setIsPaused, setIsGenerating } from '@/lib/ttsReducer';
import { TtsStateManager } from '@/lib/managers/TtsStateManager';

describe('TTS Toggle Functionality - Acceptance Criteria', () => {
  describe('Criterion 1: Clear toggle functionality available', () => {
    it('should provide toggleTts action that switches enabled state', () => {
      const initialState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        isEnabled: true,
      };

      // Test toggling from enabled to disabled
      const disabledState = ttsReducer(initialState, toggleTts());
      expect(disabledState.isEnabled).toBe(false);

      // Test toggling from disabled to enabled
      const enabledState = ttsReducer(disabledState, toggleTts());
      expect(enabledState.isEnabled).toBe(true);
    });

    it('should provide setIsEnabled action for explicit control', () => {
      const initialState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        isEnabled: true,
      };

      // Test explicit disable
      const disabledState = ttsReducer(initialState, setIsEnabled(false));
      expect(disabledState.isEnabled).toBe(false);

      // Test explicit enable
      const enabledState = ttsReducer(disabledState, setIsEnabled(true));
      expect(enabledState.isEnabled).toBe(true);
    });
  });

  describe('Criterion 2: TTS status always visible', () => {
    it('should maintain isEnabled state in TtsState interface', () => {
      const stateManager = new TtsStateManager();
      const state = stateManager.getState();

      // Verify isEnabled is part of the state
      expect(state.hasOwnProperty('isEnabled')).toBe(true);
      expect(typeof state.isEnabled).toBe('boolean');
      expect(state.isEnabled).toBe(true); // Default should be enabled
    });

    it('should allow toggling enabled state through TtsStateManager', () => {
      const stateManager = new TtsStateManager();

      // Initial state should be enabled
      expect(stateManager.getState().isEnabled).toBe(true);

      // Toggle to disabled
      stateManager.toggleEnabled();
      expect(stateManager.getState().isEnabled).toBe(false);

      // Toggle back to enabled
      stateManager.toggleEnabled();
      expect(stateManager.getState().isEnabled).toBe(true);
    });
  });

  describe('Criterion 3: Audio stops immediately when TTS is disabled', () => {
    it('should stop all audio states when toggleTts disables TTS', () => {
      const playingState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: true,
        isPaused: false,
        isGenerating: true,
        error: null,
        isEnabled: true,
      };

      // When TTS is disabled, all audio states should be reset
      const disabledState = ttsReducer(playingState, toggleTts());

      expect(disabledState.isEnabled).toBe(false);
      expect(disabledState.isPlaying).toBe(false);
      expect(disabledState.isPaused).toBe(false);
      expect(disabledState.isGenerating).toBe(false);
      expect(disabledState.error).toBe(null);
    });

    it('should stop all audio states when setIsEnabled(false) is called', () => {
      const pausedState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: false,
        isPaused: true,
        isGenerating: false,
        error: 'Some error',
        isEnabled: true,
      };

      // When explicitly disabled, all audio states should be reset
      const disabledState = ttsReducer(pausedState, setIsEnabled(false));

      expect(disabledState.isEnabled).toBe(false);
      expect(disabledState.isPlaying).toBe(false);
      expect(disabledState.isPaused).toBe(false);
      expect(disabledState.isGenerating).toBe(false);
      expect(disabledState.error).toBe(null);
    });

    it('should stop audio through TtsStateManager when disabled', () => {
      const stateManager = new TtsStateManager();

      // Set up a playing state
      stateManager.setPlaying(true);
      stateManager.setGenerating(true);

      expect(stateManager.getState().isPlaying).toBe(true);
      expect(stateManager.getState().isGenerating).toBe(true);

      // Disable TTS - should stop all audio
      stateManager.disableTts();

      const state = stateManager.getState();
      expect(state.isEnabled).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('Criterion 4: Setting persists during session', () => {
    it('should not change enabled state when other audio states change', () => {
      const initialState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        isEnabled: false, // Start disabled
      };

      // Test that other state changes don't affect isEnabled
      let state = ttsReducer(initialState, setIsPlaying(true));
      expect(state.isEnabled).toBe(false);

      state = ttsReducer(state, setIsPaused(true));
      expect(state.isEnabled).toBe(false);

      state = ttsReducer(state, setIsGenerating(true));
      expect(state.isEnabled).toBe(false);
    });

    it('should maintain enabled state when re-enabling TTS', () => {
      const disabledState: TtsReducerState = {
        selectedAdapterType: 'elevenlabs',
        availableAdapters: [],
        isRecreatingServices: false,
        voices: [],
        selectedVoice: null,
        isLoadingVoices: false,
        voicesError: null,
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        isEnabled: false,
      };

      // When re-enabling, only isEnabled should change, other states should remain reset
      const enabledState = ttsReducer(disabledState, setIsEnabled(true));

      expect(enabledState.isEnabled).toBe(true);
      expect(enabledState.isPlaying).toBe(false);
      expect(enabledState.isPaused).toBe(false);
      expect(enabledState.isGenerating).toBe(false);
      expect(enabledState.error).toBe(null);
    });

    it('should preserve TTS state across state manager operations', () => {
      const stateManager = new TtsStateManager();

      // Disable TTS
      stateManager.disableTts();
      expect(stateManager.getState().isEnabled).toBe(false);

      // Other operations should not change enabled state
      stateManager.setError('Test error');
      expect(stateManager.getState().isEnabled).toBe(false);

      stateManager.reset(); // This should NOT change isEnabled
      expect(stateManager.getState().isEnabled).toBe(false);

      // Only explicit enable should change it
      stateManager.enableTts();
      expect(stateManager.getState().isEnabled).toBe(true);
    });
  });

  describe('Integration: Complete toggle workflow', () => {
    it('should handle complete enable/disable cycle correctly', () => {
      const stateManager = new TtsStateManager();

      // Start with TTS enabled and audio playing
      stateManager.setPlaying(true);
      stateManager.setPaused(false);
      stateManager.setGenerating(true);

      let state = stateManager.getState();
      expect(state.isEnabled).toBe(true);
      expect(state.isPlaying).toBe(true);
      expect(state.isGenerating).toBe(true);

      // Disable TTS - should immediately stop all audio
      stateManager.toggleEnabled();

      state = stateManager.getState();
      expect(state.isEnabled).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBe(null);

      // Re-enable TTS - should be ready but not automatically start playing
      stateManager.toggleEnabled();

      state = stateManager.getState();
      expect(state.isEnabled).toBe(true);
      expect(state.isPlaying).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBe(null);
    });
  });
});
