import React from 'react';
import { Select } from '@/Components/UI/index';
import { AdapterType, AdapterOption } from '@/lib/factories/AdapterFactory';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsProviderSelectorProps {
  selectedAdapterType: AdapterType;
  availableAdapters: AdapterOption[];
  isRecreatingServices: boolean;
  isGenerating: boolean;
  isPlaying: boolean;
  onAdapterChange: (adapterType: AdapterType) => void;
}

export const TtsProviderSelector: React.FC<TtsProviderSelectorProps> = ({
  selectedAdapterType,
  availableAdapters,
  isRecreatingServices,
  isGenerating,
  isPlaying,
  onAdapterChange
}) => {
  const currentAdapter = availableAdapters.find(a => a.key === selectedAdapterType);

  return (
    <div className={styles.adapterSelection}>
      <Select
        label="TTS Provider"
        value={selectedAdapterType}
        onChange={(value) => onAdapterChange(value as AdapterType)}
        disabled={isGenerating || isPlaying || isRecreatingServices}
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
          {currentAdapter.description}
          {currentAdapter.requiresApiKey && " (Requires API Key)"}
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
