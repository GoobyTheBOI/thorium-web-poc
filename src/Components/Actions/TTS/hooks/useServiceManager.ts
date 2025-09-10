import { useRef, useCallback, useEffect } from 'react';
import { createTTSServices, destroyTTSServices, TTSServices } from '@/lib/factories/TTSServicesFactory';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsState } from '@/lib/managers/TtsStateManager';

export interface UseServiceManagerProps {
  onStateChange: (state: TtsState) => void;
  onAdapterSwitch: (adapter: AdapterType) => void;
}

export function useServiceManager({ onStateChange, onAdapterSwitch }: UseServiceManagerProps) {
  const servicesRef = useRef<TTSServices | null>(null);
  const currentAdapterTypeRef = useRef<AdapterType>('elevenlabs');

  const onStateChangeRef = useRef(onStateChange);
  const onAdapterSwitchRef = useRef(onAdapterSwitch);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onAdapterSwitchRef.current = onAdapterSwitch;
  }, [onAdapterSwitch]);

  const getServices = useCallback((adapterType?: AdapterType): TTSServices => {
    const targetAdapterType = adapterType || currentAdapterTypeRef.current;

    const currentAdapterType = servicesRef.current?.orchestrationService.getCurrentAdapterType();
    if (servicesRef.current && currentAdapterType && currentAdapterType !== targetAdapterType) {
      destroyTTSServices(servicesRef.current);
      servicesRef.current = null;
    }

    if (!servicesRef.current) {
      const callbacks = {
        onStateChange: onStateChangeRef.current,
        onAdapterSwitch: onAdapterSwitchRef.current,
      };
      servicesRef.current = createTTSServices(targetAdapterType, callbacks);
      currentAdapterTypeRef.current = targetAdapterType;
    }

    return servicesRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (servicesRef.current) {
      destroyTTSServices(servicesRef.current);
      servicesRef.current = null;
    }
  }, []);

  const getKeyboardShortcuts = useCallback(() => {
    try {
      // Only get services if they exist, don't force creation during adapter switch
      if (!servicesRef.current) {
        return [];
      }
      const { keyboardHandler } = servicesRef.current;
      return keyboardHandler.getShortcuts();
    } catch {
      return [];
    }
  }, []);

  return {
    getServices,
    cleanup,
    getKeyboardShortcuts,
  };
}
