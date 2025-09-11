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
  // Helper functions for button states and text
  const getStartButtonText = (): string => {
    if (ttsState.isGenerating) return 'Generating...';
    if (ttsState.isPlaying) return 'Playing...';
    return 'Start TTS';
  };

  const isStartButtonDisabled = (): boolean => {
    return !ttsState.isEnabled || !selectedVoice || ttsState.isGenerating || ttsState.isPlaying;
  };

  const getPauseResumeButtonText = (): string => {
    return ttsState.isPaused ? 'Resume' : 'Pause';
  };

  const getPauseResumeAction = () => {
    return ttsState.isPaused ? onResume : onPause;
  };

  const isControlButtonDisabled = (): boolean => {
    return !ttsState.isEnabled || (!ttsState.isPlaying && !ttsState.isPaused);
  };

  return (
    <div className={styles.buttonContainer}>
      <ThActionButton
        isDisabled={isStartButtonDisabled()}
        onPress={onGenerateTts}
        style={{ backgroundColor: "#4CAF50", color: "white" }}
      >
        {getStartButtonText()}
      </ThActionButton>

      <ThActionButton
        onPress={getPauseResumeAction()}
        isDisabled={isControlButtonDisabled()}
        style={{ backgroundColor: "#FF9800", color: "white" }}
      >
        {getPauseResumeButtonText()}
      </ThActionButton>

      <ThActionButton
        onPress={onStop}
        isDisabled={isControlButtonDisabled()}
        style={{ backgroundColor: "#f44336", color: "white" }}
      >
        Stop
      </ThActionButton>
    </div>
  );
};
