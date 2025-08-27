import React from 'react';
import { ThActionButton } from '@edrlab/thorium-web/core/components';
import { TtsState } from '@/lib/managers/TtsStateManager';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsControlPanelProps {
  ttsState: TtsState;
  selectedVoice: string | null;
  onGenerateTts: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const TtsControlPanel: React.FC<TtsControlPanelProps> = ({
  ttsState,
  selectedVoice,
  onGenerateTts,
  onPause,
  onResume,
  onStop
}) => {
  return (
    <div className={styles.buttonContainer}>
      <ThActionButton
        isDisabled={!selectedVoice || ttsState.isGenerating || ttsState.isPlaying}
        onPress={onGenerateTts}
        style={{ backgroundColor: "#4CAF50", color: "white" }}
      >
        {ttsState.isGenerating ? 'Generating...' : 'Start TTS'}
      </ThActionButton>

      <ThActionButton
        onPress={ttsState.isPaused ? onResume : onPause}
        isDisabled={!ttsState.isPlaying && !ttsState.isPaused}
        style={{ backgroundColor: "#FF9800", color: "white" }}
      >
        {ttsState.isPaused ? 'Resume' : 'Pause'}
      </ThActionButton>

      <ThActionButton
        onPress={onStop}
        isDisabled={!ttsState.isPlaying && !ttsState.isPaused}
        style={{ backgroundColor: "#f44336", color: "white" }}
      >
        Stop
      </ThActionButton>
    </div>
  );
};
