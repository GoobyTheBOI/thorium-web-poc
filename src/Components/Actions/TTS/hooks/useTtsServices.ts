import { useCallback, useRef } from 'react';
import { TTSServicesFactory, TTSServiceDependencies } from '@/lib/factories/TTSServicesFactory';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsState } from '@/lib/managers/TtsStateManager';

export interface UseTtsServicesProps {
  onStateChange: (state: TtsState) => void;
  onAdapterSwitch: (adapter: AdapterType) => void;
}

export function useTtsServices({ onStateChange, onAdapterSwitch }: UseTtsServicesProps) {
  const servicesRef = useRef<TTSServiceDependencies | null>(null);
  const currentAdapterTypeRef = useRef<AdapterType>('elevenlabs');

  const getServices = useCallback((adapterType?: AdapterType): TTSServiceDependencies => {
    const targetAdapterType = adapterType || currentAdapterTypeRef.current;

    const currentAdapterType = servicesRef.current?.orchestrationService.getCurrentAdapterType();
    if (servicesRef.current && currentAdapterType && currentAdapterType !== targetAdapterType) {
      console.log('Cleaning up existing services before creating new ones');
      TTSServicesFactory.destroy(servicesRef.current);
      servicesRef.current = null;
    }

    if (!servicesRef.current) {
      console.log('Creating new TTS services for adapter:', targetAdapterType);

      const handleStateChange = (state: TtsState) => {
        onStateChange(state);
      };

      const handleAdapterSwitch = (newAdapter: AdapterType) => {
        setTimeout(() => {
          onAdapterSwitch(newAdapter);
        }, 0);
      };

      servicesRef.current = TTSServicesFactory.create(targetAdapterType, handleStateChange, handleAdapterSwitch);
      currentAdapterTypeRef.current = targetAdapterType;
    }

    return servicesRef.current;
  }, [onStateChange, onAdapterSwitch]);

  const cleanup = useCallback(() => {
    if (servicesRef.current) {
      console.log('Cleaning up TTS services');
      TTSServicesFactory.destroy(servicesRef.current);
      servicesRef.current = null;
    }
  }, []);

  return {
    getServices,
    cleanup,
    currentServices: servicesRef.current
  };
}
