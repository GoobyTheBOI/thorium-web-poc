import { useReducer, useCallback, useRef, useEffect } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsState } from '@/lib/managers/TtsStateManager';
import ttsReducer, {
  TtsReducerState,
  setIsPlaying,
  setIsPaused,
  setIsGenerating,
  setError
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
    dispatch(setIsPlaying(ttsState.isPlaying));
    dispatch(setIsPaused(ttsState.isPaused));
    dispatch(setIsGenerating(ttsState.isGenerating));
    dispatch(setError(ttsState.error));

    onStateChangeRef.current?.(ttsState);
  }, [dispatch]);

  const { getServices, cleanup, getKeyboardShortcuts } = useServiceManager({
    onStateChange: stableStateChangeCallback,
    onAdapterSwitch: () => {},
  });

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
    loadVoices,
    cleanup
  });

  return {
    ttsState: {
      isPlaying: state.isPlaying,
      isPaused: state.isPaused,
      isGenerating: state.isGenerating,
      error: state.error,
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
    },

    cleanup,
    getKeyboardShortcuts,
  };
}
