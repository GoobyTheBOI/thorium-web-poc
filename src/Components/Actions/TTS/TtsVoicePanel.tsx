import React from 'react';
import { VoiceSelection } from '@/Components/UI/index';
import { VoiceInfo } from '@/preferences/types';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsVoicePanelProps {
  voices: VoiceInfo[];
  selectedVoice: string | null;
  isLoadingVoices: boolean;
  voicesError: string | null;
  isGenerating: boolean;
  isPlaying: boolean;
  isEnabled?: boolean;
  onVoiceChange: (voiceId: string) => void;
}

export const TtsVoicePanel: React.FC<TtsVoicePanelProps> = ({
  voices,
  selectedVoice,
  isLoadingVoices,
  voicesError,
  isGenerating,
  isPlaying,
  isEnabled = true,
  onVoiceChange
}) => {
  return (
    <div className={styles.voiceSelection}>
      <VoiceSelection
        voices={voices}
        selectedVoice={selectedVoice}
        onVoiceChange={onVoiceChange}
        disabled={!isEnabled || isGenerating || isPlaying}
        loading={isLoadingVoices}
        error={voicesError}
      />
    </div>
  );
};
