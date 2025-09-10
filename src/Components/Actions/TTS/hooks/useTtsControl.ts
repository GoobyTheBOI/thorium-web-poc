import { useCallback } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TTSServices } from '@/lib/factories/TTSServicesFactory';
import { TtsReducerState } from '@/lib/ttsReducer';
import {
  setIsGenerating,
  setVoicesError
} from '@/lib/ttsReducer';
import { extractErrorMessage } from '@/lib/utils/errorUtils';

export interface UseTtsControlProps {
  state: TtsReducerState;
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
    if (!state.selectedVoice) {
      handleError('Please select a voice');
      return;
    }

    dispatch(setIsGenerating(true));
    dispatch(setVoicesError(null));

    try {
      const services = getServices();
      await prepareVoice(services, state.selectedVoice);

      const chunks = await extractTextChunks(services);
      if (chunks.length === 0) {
        handleError('No text found to convert');
        return;
      }

      await services.orchestrationService.startReading();
      // Note: orchestrationService handles setting isGenerating to false
      // after the first chunk starts playing
    } catch (error) {
      const errorMessage = extractErrorMessage(error, 'Failed to generate audio');
      handleError(errorMessage);
    }
  }, [state.selectedVoice, getServices, dispatch, onError]);

  const handleError = (errorMessage: string) => {
    dispatch(setVoicesError(errorMessage));
    dispatch(setIsGenerating(false));
    onError?.(errorMessage);
  };

  const prepareVoice = async (services: TTSServices, selectedVoice: string) => {
    await services.voiceHandler.setVoice(selectedVoice);
  };

  const extractTextChunks = async (services: TTSServices) => {
    return await services.textExtractionService.extractTextChunks();
  };

  const pause = useCallback(() => {
    if (canPause()) {
      const { orchestrationService } = getServices();
      orchestrationService.pauseReading();
    }
  }, [getServices, state.isPlaying, state.isPaused]);

  const resume = useCallback(() => {
    if (canResume()) {
      const { orchestrationService } = getServices();
      orchestrationService.resumeReading();
    }
  }, [getServices, state.isPlaying, state.isPaused]);

  const stop = useCallback(() => {
    const { orchestrationService } = getServices();
    orchestrationService.stopReading();
  }, [getServices]);

  // Helper functions for state validation
  const canPause = (): boolean => state.isPlaying && !state.isPaused;
  const canResume = (): boolean => !state.isPlaying && state.isPaused;

  return {
    generateTts,
    pause,
    resume,
    stop,
  };
}
