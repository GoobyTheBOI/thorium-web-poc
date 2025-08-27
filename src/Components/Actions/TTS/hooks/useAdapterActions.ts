import { useCallback, useRef, useEffect } from 'react';
import { AdapterType } from '@/lib/factories/AdapterFactory';
import { TtsReducerState } from '@/lib/ttsReducer';
import {
  startAdapterSwitch,
  finishAdapterSwitch,
  adapterSwitchFailed,
  setVoicesError
} from '@/lib/ttsReducer';

export interface UseAdapterActionsProps {
  state: TtsReducerState;
  dispatch: (action: any) => void;
  loadVoices: (adapterType?: AdapterType) => Promise<void>;
  cleanup: () => void;
  onError?: (error: string) => void;
}

/**
 * Handles adapter switching and management
 * Single Responsibility: Adapter management only
 */
export function useAdapterActions({
  state,
  dispatch,
  loadVoices,
  cleanup,
  onError
}: UseAdapterActionsProps) {

  const dispatchRef = useRef(dispatch);
  const loadVoicesRef = useRef(loadVoices);
  const cleanupRef = useRef(cleanup);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    loadVoicesRef.current = loadVoices;
  }, [loadVoices]);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const changeAdapter = useCallback(async (newAdapterType: AdapterType) => {
    if (newAdapterType === state.selectedAdapterType) return;

    const adapter = state.availableAdapters.find(a => a.key === newAdapterType);
    if (!adapter?.isImplemented) {
      const errorMessage = `${adapter?.name || 'This adapter'} is not yet implemented`;
      dispatchRef.current(setVoicesError(errorMessage));
      onErrorRef.current?.(errorMessage);
      return;
    }

    dispatchRef.current(startAdapterSwitch(newAdapterType));

    try {
      cleanupRef.current();
      await loadVoicesRef.current(newAdapterType);
      dispatchRef.current(finishAdapterSwitch());
    } catch (error) {
      console.error('Error changing adapter:', error);
      const errorMessage = `Failed to switch to ${adapter?.name || 'new adapter'}`;
      dispatchRef.current(adapterSwitchFailed(errorMessage));
      onErrorRef.current?.(errorMessage);
    }
  }, [state.selectedAdapterType, state.availableAdapters]);

  return {
    changeAdapter,
  };
}
