import { useCallback } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TTSServiceDependencies } from '@/lib/factories/TTSServicesFactory';
import { TtsReducerState } from '@/lib/ttsReducer';
import {
  setIsGenerating,
  setVoicesError
} from '@/lib/ttsReducer';

export interface UseTtsControlProps {
  state: TtsReducerState;
  getServices: (adapterType?: AdapterType) => TTSServiceDependencies;
  dispatch: (action: any) => void;
  onError?: (error: string) => void;
}

/**
 * Handles TTS playback control actions
 * Single Responsibility: TTS playback control only
 */
export function useTtsControl({ state, getServices, dispatch, onError }: UseTtsControlProps) {

  const generateTts = useCallback(async () => {
    if (!state.selectedVoice) {
      const errorMessage = 'Please select a voice';
      dispatch(setVoicesError(errorMessage));
      onError?.(errorMessage);
      return;
    }

    dispatch(setIsGenerating(true));
    dispatch(setVoicesError(null));

    try {
      const { orchestrationService, textExtractionService, voiceHandler } = getServices();

      if (state.selectedVoice) {
        await voiceHandler.setVoice(state.selectedVoice);
      }

      const chunks = await textExtractionService.extractTextChunks();
      if (chunks.length === 0) {
        const errorMessage = 'No text found to convert';
        dispatch(setVoicesError(errorMessage));
        onError?.(errorMessage);
        return;
      }

      await orchestrationService.startReading();
    } catch (error) {
      console.error('Error generating TTS:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate audio';
      dispatch(setVoicesError(errorMessage));
      onError?.(errorMessage);
    } finally {
      dispatch(setIsGenerating(false));
    }
  }, [state.selectedVoice, getServices, dispatch, onError]);

  const pause = useCallback(() => {
    const { orchestrationService } = getServices();
    if (state.isPlaying && !state.isPaused) {
      orchestrationService.pauseReading();
    }
  }, [getServices, state.isPlaying, state.isPaused]);

  const resume = useCallback(() => {
    const { orchestrationService } = getServices();
    if (!state.isPlaying && state.isPaused) {
      orchestrationService.resumeReading();
    }
  }, [getServices, state.isPlaying, state.isPaused]);

  const stop = useCallback(() => {
    const { orchestrationService } = getServices();
    orchestrationService.stopReading();
  }, [getServices]);

  return {
    generateTts,
    pause,
    resume,
    stop,
  };
}
