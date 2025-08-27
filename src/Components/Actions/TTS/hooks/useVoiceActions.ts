import { useCallback, useRef, useEffect } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TTSServices } from '@/lib/factories/TTSServicesFactory';
import {
  startVoiceLoading,
  finishVoiceLoading,
  voiceLoadingFailed,
  setSelectedVoice,
  setVoicesError
} from '@/lib/ttsReducer';

export interface UseVoiceActionsProps {
  getServices: (adapterType?: AdapterType) => TTSServices;
  dispatch: (action: { type: string; payload?: unknown }) => void;
  onError?: (error: string) => void;
}

export function useVoiceActions({ getServices, dispatch, onError }: UseVoiceActionsProps) {
  const isLoadingRef = useRef(false);

  const getServicesRef = useRef(getServices);
  const dispatchRef = useRef(dispatch);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    getServicesRef.current = getServices;
  }, [getServices]);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadVoices = useCallback(async (adapterType?: AdapterType) => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    dispatchRef.current(startVoiceLoading());

    try {
      const { voiceHandler } = getServicesRef.current(adapterType);
      const voiceList = await voiceHandler.loadVoices();
      const selectedVoiceId = voiceHandler.getCurrentVoiceId();

      dispatchRef.current(finishVoiceLoading({
        voices: voiceList,
        selectedVoice: selectedVoiceId
      }));
    } catch (error) {
      console.error('Error loading voices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load voices';
      dispatchRef.current(voiceLoadingFailed(errorMessage));
      onErrorRef.current?.(errorMessage);
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const changeVoice = useCallback(async (voiceId: string) => {
    dispatchRef.current(setSelectedVoice(voiceId));

    try {
      const { voiceHandler } = getServicesRef.current();
      await voiceHandler.setVoice(voiceId);
      dispatchRef.current(setVoicesError(null));
    } catch (error) {
      console.error('Error setting voice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set voice';
      dispatchRef.current(setVoicesError(errorMessage));
      onErrorRef.current?.(errorMessage);
    }
  }, []);

  return {
    loadVoices,
    changeVoice,
  };
}
