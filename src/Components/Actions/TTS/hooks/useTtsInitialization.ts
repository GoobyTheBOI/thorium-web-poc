import { useEffect, useRef } from 'react';
import { TTSAdapterFactory, AdapterType } from '@/lib/factories/AdapterFactory';
import { TTSServiceDependencies } from '@/lib/factories/TTSServicesFactory';
import { TtsReducerState } from '@/lib/ttsReducer';
import {
  setAvailableAdapters,
  setIsPlaying,
  setIsPaused,
  setIsGenerating,
  setError,
  finishVoiceLoading,
  voiceLoadingFailed
} from '@/lib/ttsReducer';

export interface UseTtsInitializationProps {
  state: TtsReducerState;
  dispatch: (action: any) => void;
  getServices: (adapterType?: AdapterType) => TTSServiceDependencies;
  loadVoices: (adapterType?: AdapterType) => Promise<void>;
  cleanup: () => void;
}

export function useTtsInitialization({
  state,
  dispatch,
  getServices,
  loadVoices,
  cleanup
}: UseTtsInitializationProps) {

  const initializedRef = useRef(false);

  useEffect(() => {
    dispatch(setAvailableAdapters(TTSAdapterFactory.getAvailableAdapters()));
  }, [dispatch]);


  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const initializeOnce = async () => {
      try {
        const services = getServices();
        const initialState = services.orchestrationService.getState();

        dispatch(setIsPlaying(initialState.isPlaying));
        dispatch(setIsPaused(initialState.isPaused));
        dispatch(setIsGenerating(initialState.isGenerating));
        dispatch(setError(initialState.error));

        const { voiceHandler } = services;
        const voiceList = await voiceHandler.loadVoices();
        const selectedVoiceId = voiceHandler.getCurrentVoiceId();

        dispatch(finishVoiceLoading({
          voices: voiceList,
          selectedVoice: selectedVoiceId
        }));
      } catch (error) {
        dispatch(voiceLoadingFailed(error instanceof Error ? error.message : 'Failed to initialize TTS'));
      }
    };

    initializeOnce();
  }, []);

  useEffect(() => {
    if (state.isRecreatingServices) {
    }
  }, [state.isRecreatingServices]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
}
