import { useState, useCallback } from 'react';
import { AdapterType, AdapterOption } from '@/lib/factories/AdapterFactory';

export interface AdapterState {
  selectedAdapterType: AdapterType;
  availableAdapters: AdapterOption[];
  isRecreatingServices: boolean;
}

export interface UseAdapterManagementProps {
  loadVoices: (adapterType?: AdapterType) => Promise<void>;
  cleanup: () => void;
  setVoicesError: (error: string | null) => void;
}

export function useAdapterManagement({
  loadVoices,
  cleanup,
  setVoicesError
}: UseAdapterManagementProps) {
  const [adapterState, setAdapterState] = useState<AdapterState>({
    selectedAdapterType: 'elevenlabs',
    availableAdapters: [],
    isRecreatingServices: false
  });

  const setSelectedAdapterType = useCallback((type: AdapterType) => {
    setAdapterState(prev => ({ ...prev, selectedAdapterType: type }));
  }, []);

  const setAvailableAdapters = useCallback((adapters: AdapterOption[]) => {
    setAdapterState(prev => ({ ...prev, availableAdapters: adapters }));
  }, []);

  const handleAdapterChange = useCallback(async (newAdapterType: AdapterType) => {
    if (newAdapterType === adapterState.selectedAdapterType) return;

    const adapter = adapterState.availableAdapters.find(a => a.key === newAdapterType);
    if (!adapter?.isImplemented) {
      setVoicesError(`${adapter?.name || 'This adapter'} is not yet implemented`);
      return;
    }

    setAdapterState(prev => ({ ...prev, isRecreatingServices: true }));
    setVoicesError(null);

    try {
      cleanup();
      setSelectedAdapterType(newAdapterType);
      await loadVoices(newAdapterType);
    } catch (error) {
      console.error('Error changing adapter:', error);
      setVoicesError(`Failed to switch to ${adapter?.name || 'new adapter'}`);
    } finally {
      setAdapterState(prev => ({ ...prev, isRecreatingServices: false }));
    }
  }, [adapterState.selectedAdapterType, adapterState.availableAdapters, loadVoices, cleanup, setVoicesError]);

  return {
    adapterState,
    setSelectedAdapterType,
    setAvailableAdapters,
    handleAdapterChange
  };
}
