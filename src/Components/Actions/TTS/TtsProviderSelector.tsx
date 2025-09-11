import React from 'react';
import { Select } from '@/Components/UI/index';
import { AdapterType, AdapterInfo } from '@/lib/factories/AdapterFactory';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsProviderSelectorProps {
  selectedAdapterType: AdapterType;
  availableAdapters: AdapterInfo[];
  isRecreatingServices: boolean;
  isGenerating: boolean;
  isPlaying: boolean;
  isEnabled?: boolean;
  onAdapterChange: (adapterType: AdapterType) => void;
}

export const TtsProviderSelector: React.FC<TtsProviderSelectorProps> = ({
  selectedAdapterType,
  availableAdapters,
  isRecreatingServices,
  isGenerating,
  isPlaying,
  isEnabled = true,
  onAdapterChange
}) => {
  const currentAdapter = availableAdapters.find(a => a.key === selectedAdapterType);

  const handleAdapterChange = (value: string) => {
    onAdapterChange(value as AdapterType);
  };

  return (
    <div className={styles.adapterSelection}>
      <Select
        label="TTS Provider"
        value={selectedAdapterType}
        onChange={handleAdapterChange}
        disabled={isRecreatingServices || isGenerating || isPlaying || !isEnabled}
        className={styles.select}
      >
        {availableAdapters.map((adapter) => (
          <option
            key={adapter.key}
            value={adapter.key}
            disabled={!adapter.isImplemented}
          >
            {adapter.name}{adapter.isImplemented ? '' : ' (Coming Soon)'}
          </option>
        ))}
      </Select>

      {/* Adapter Description */}
      {currentAdapter && (
        <p className={styles.adapterDescription}>
          {currentAdapter.name} TTS Service
        </p>
      )}

      {isRecreatingServices && (
        <p className={styles.switchingMessage}>
          🔄 Switching TTS provider...
        </p>
      )}
    </div>
  );
};
