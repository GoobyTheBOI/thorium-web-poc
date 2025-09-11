import { useReducer, useCallback, useRef, useEffect } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsState } from '@/lib/managers/TtsStateManager';
import ttsReducer, {
  TtsReducerState,
  setIsPlaying,
  setIsPaused,
  setIsGenerating,
  setError,
  toggleTts,
  setIsEnabled
} from '@/lib/ttsReducer';

import { useServiceManager } from './useServiceManager';
import { useVoiceActions } from './useVoiceActions';
import { useAdapterActions } from './useAdapterActions';
import { useTtsControl } from './useTtsControl';
import { useTtsInitialization } from './useTtsInitialization';

export interface UseTtsProps {
  onStateChange?: (state: TtsState) => void;
  onError?: (error: string) => void;
}

export function useTts({ onStateChange, onError }: UseTtsProps = {}) {
  const [state, dispatch] = useReducer(ttsReducer, {
    selectedAdapterType: 'elevenlabs' as AdapterType,
    availableAdapters: [],
    isRecreatingServices: false,
    voices: [],
    selectedVoice: null,
    isLoadingVoices: true,
    voicesError: null,
    isPlaying: false,
    isPaused: false,
    isGenerating: false,
    error: null,
    isEnabled: true,
  } as TtsReducerState);

  const onStateChangeRef = useRef(onStateChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleError = useCallback((error: string) => {
    console.error('TTS Error:', error);
    onErrorRef.current?.(error);
  }, []);

  const stableStateChangeCallback = useCallback((ttsState: TtsState) => {
    // Update the reducer state to match the TtsStateManager state
    dispatch(setIsPlaying(ttsState.isPlaying));
    dispatch(setIsPaused(ttsState.isPaused));
    dispatch(setIsGenerating(ttsState.isGenerating));
    if (ttsState.error) {
      dispatch(setError(ttsState.error));
    }

    // Also call the external callback if provided
    onStateChangeRef.current?.(ttsState);
  }, [dispatch]);

  // Create a ref to hold the changeAdapter function
  const changeAdapterRef = useRef<((adapterType: AdapterType) => void) | null>(null);
  const servicesRef = useRef<any>(null);

  // TTS Toggle functionality (defined early so it can be passed to service manager)
  const toggleTtsEnabled = useCallback(() => {
    const currentlyEnabled = state.isEnabled;
    
    // If currently enabled and playing/paused, stop the audio first
    if (currentlyEnabled && (state.isPlaying || state.isPaused)) {
      try {
        const services = servicesRef.current;
        if (services) {
          services.orchestrationService.stopReading();
        }
      } catch (error) {
        console.error('Error stopping TTS during toggle:', error);
      }
    }
    
    dispatch(toggleTts());
  }, [state.isEnabled, state.isPlaying, state.isPaused, dispatch]);

  const setTtsEnabled = useCallback((enabled: boolean) => {
    // If disabling and currently playing/paused, stop the audio first
    if (!enabled && (state.isPlaying || state.isPaused)) {
      try {
        const services = servicesRef.current;
        if (services) {
          services.orchestrationService.stopReading();
        }
      } catch (error) {
        console.error('Error stopping TTS during disable:', error);
      }
    }
    
    dispatch(setIsEnabled(enabled));
  }, [state.isPlaying, state.isPaused, dispatch]);

  const handleAdapterSwitch = useCallback((adapterType: AdapterType) => {
    if (changeAdapterRef.current) {
      changeAdapterRef.current(adapterType);
    }
  }, []);

  const { getServices, cleanup, getKeyboardShortcuts } = useServiceManager({
    onStateChange: stableStateChangeCallback,
    onAdapterSwitch: handleAdapterSwitch,
    onToggle: toggleTtsEnabled,
  });

  // Store services reference for toggle functionality
  useEffect(() => {
    try {
      servicesRef.current = getServices();
    } catch (error) {
      console.error('Error getting services:', error);
    }
  }, [getServices]);

  const { loadVoices, changeVoice } = useVoiceActions({
    getServices,
    dispatch,
    onError: handleError
  });

  const { changeAdapter } = useAdapterActions({
    state,
    dispatch,
    loadVoices,
    cleanup,
    onError: handleError
  });

  // Update the ref when changeAdapter changes
  useEffect(() => {
    changeAdapterRef.current = changeAdapter;
  }, [changeAdapter]);

  const { generateTts, pause, resume, stop } = useTtsControl({
    state,
    getServices,
    dispatch,
    onError: handleError
  });

  useTtsInitialization({
    state,
    dispatch,
    getServices,
    cleanup
  });

  return {
    ttsState: {
      isPlaying: state.isPlaying,
      isPaused: state.isPaused,
      isGenerating: state.isGenerating,
      error: state.error,
      isEnabled: state.isEnabled,
    },
    voiceState: {
      voices: state.voices,
      selectedVoice: state.selectedVoice,
      isLoadingVoices: state.isLoadingVoices,
      voicesError: state.voicesError,
    },
    adapterState: {
      selectedAdapterType: state.selectedAdapterType,
      availableAdapters: state.availableAdapters,
      isRecreatingServices: state.isRecreatingServices,
    },
    actions: {
      generateTts,
      pause,
      resume,
      stop,
      changeVoice,
      changeAdapter,
      loadVoices,
      toggleTtsEnabled,
      setTtsEnabled,
    },

    cleanup,
    getKeyboardShortcuts,
  };
}
