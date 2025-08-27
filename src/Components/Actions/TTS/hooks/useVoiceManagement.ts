import { useState, useCallback } from 'react';
import { VoiceInfo } from '@/preferences/types';
import { AdapterType } from '@/lib/factories/AdapterFactory';

export interface VoiceState {
  voices: VoiceInfo[];
  isLoadingVoices: boolean;
  voicesError: string | null;
  selectedVoice: string | null;
}

export interface UseVoiceManagementProps {
  getServices: (adapterType?: AdapterType) => any;
}

export function useVoiceManagement({ getServices }: UseVoiceManagementProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    voices: [],
    isLoadingVoices: true,
    voicesError: null,
    selectedVoice: null
  });

  const loadVoices = useCallback(async (adapterType?: AdapterType) => {
    setVoiceState(prev => ({ ...prev, isLoadingVoices: true, voicesError: null }));

    try {
      const { voiceHandler } = getServices(adapterType);
      const voiceList = await voiceHandler.loadVoices();
      const selectedVoiceId = voiceHandler.getCurrentVoiceId();

      setVoiceState(prev => ({
        ...prev,
        voices: voiceList,
        selectedVoice: selectedVoiceId,
        isLoadingVoices: false
      }));
    } catch (error) {
      console.error('Error loading voices:', error);
      setVoiceState(prev => ({
        ...prev,
        voicesError: 'Failed to load voices',
        isLoadingVoices: false
      }));
    }
  }, [getServices]);

  const handleVoiceChange = useCallback(async (voiceId: string) => {
    setVoiceState(prev => ({ ...prev, selectedVoice: voiceId }));

    try {
      const { voiceHandler } = getServices();
      await voiceHandler.setVoice(voiceId);
      setVoiceState(prev => ({ ...prev, voicesError: null }));
    } catch (error) {
      console.error('Error setting voice:', error);
    }
  }, [getServices]);

  const setVoicesError = useCallback((error: string | null) => {
    setVoiceState(prev => ({ ...prev, voicesError: error }));
  }, []);

  return {
    voiceState,
    loadVoices,
    handleVoiceChange,
    setVoicesError
  };
}
