import { useCallback } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TTSServices } from '@/lib/factories/TTSServicesFactory';
import { TtsState } from '@/lib/ttsReducer';
import {
  setIsGenerating,
  setVoicesError
} from '@/lib/ttsReducer';

export interface UseTtsControlProps {
  state: TtsState;
  getServices: (adapterType?: AdapterType) => TTSServices;
  dispatch: (action: { type: string; payload?: unknown }) => void;
  onError?: (error: string) => void;
}

/**
 * Handles TTS playback control actions
 * Single Responsibility: TTS playback control only
 */
export function useTtsControl({ state, getServices, dispatch, onError }: UseTtsControlProps) {

  const generateTts = useCallback(async () => {
    if (!state.selectedVoiceId) {
      const errorMessage = 'Please select a voice';
      dispatch(setVoicesError(errorMessage));
      onError?.(errorMessage);
      return;
    }

    dispatch(setIsGenerating(true));
    dispatch(setVoicesError(null));

    try {
      const { orchestrationService, textExtractionService, voiceHandler } = getServices();

      if (state.selectedVoiceId) {
        await voiceHandler.setVoice(state.selectedVoiceId);
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
  }, [state.selectedVoiceId, getServices, dispatch, onError]);

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
