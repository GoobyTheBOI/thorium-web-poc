import { useRef, useCallback, useEffect } from 'react';
import { TTSServicesFactory, TTSServiceDependencies } from '@/lib/factories/TTSServicesFactory';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsState } from '@/lib/managers/TtsStateManager';

export interface UseServiceManagerProps {
  onStateChange: (state: TtsState) => void;
  onAdapterSwitch: (adapter: AdapterType) => void;
}

export function useServiceManager({ onStateChange, onAdapterSwitch }: UseServiceManagerProps) {
  const servicesRef = useRef<TTSServiceDependencies | null>(null);
  const currentAdapterTypeRef = useRef<AdapterType>('elevenlabs');

  const onStateChangeRef = useRef(onStateChange);
  const onAdapterSwitchRef = useRef(onAdapterSwitch);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onAdapterSwitchRef.current = onAdapterSwitch;
  }, [onAdapterSwitch]);

  const getServices = useCallback((adapterType?: AdapterType): TTSServiceDependencies => {
    const targetAdapterType = adapterType || currentAdapterTypeRef.current;

    const currentAdapterType = servicesRef.current?.orchestrationService.getCurrentAdapterType();
    if (servicesRef.current && currentAdapterType && currentAdapterType !== targetAdapterType) {
      TTSServicesFactory.destroy(servicesRef.current);
      servicesRef.current = null;
    }

    if (!servicesRef.current) {
      const handleStateChange = (ttsState: TtsState) => {
        onStateChangeRef.current(ttsState);
      };

      const handleAdapterSwitch = (newAdapter: AdapterType) => {
        onAdapterSwitchRef.current(newAdapter);
      };

      servicesRef.current = TTSServicesFactory.create(
        targetAdapterType,
        handleStateChange,
        handleAdapterSwitch
      );
      currentAdapterTypeRef.current = targetAdapterType;
    }

    return servicesRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (servicesRef.current) {
      TTSServicesFactory.destroy(servicesRef.current);
      servicesRef.current = null;
    }
  }, []);

  const getKeyboardShortcuts = useCallback(() => {
    try {
      const { keyboardHandler } = getServices();
      return keyboardHandler.getShortcuts();
    } catch {
      return [];
    }
  }, [getServices]);

  return {
    getServices,
    cleanup,
    getKeyboardShortcuts,
  };
}
