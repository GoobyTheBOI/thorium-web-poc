import React from 'react';
import { ThActionButton } from '@edrlab/thorium-web/core/components';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsToggleProps {
  isEnabled: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isGenerating: boolean;
  onToggle: () => void;
}

export const TtsToggle: React.FC<TtsToggleProps> = ({
  isEnabled,
  isPlaying,
  isPaused,
  isGenerating,
  onToggle
}) => {
  const getToggleButtonText = (): string => {
    return isEnabled ? 'TTS On' : 'TTS Off';
  };

  const getToggleButtonStyle = () => {
    return {
      backgroundColor: isEnabled ? '#4CAF50' : '#9E9E9E',
      color: 'white',
      border: isEnabled ? '2px solid #4CAF50' : '2px solid #9E9E9E',
      fontWeight: 'bold' as const
    };
  };

  const getStatusMessage = (): string => {
    if (!isEnabled) return 'Text-to-Speech disabled';
    if (isGenerating) return 'Generating audio...';
    if (isPlaying) return 'Text-to-Speech active';
    if (isPaused) return 'Text-to-Speech paused';
    return 'Text-to-Speech ready';
  };

  return (
    <div className={styles.toggleContainer}>
      <div className={styles.toggleSection}>
        <ThActionButton
          onPress={onToggle}
          style={getToggleButtonStyle()}
          aria-label={`Text-to-Speech ${isEnabled ? 'disable' : 'enable'}`}
        >
          {getToggleButtonText()}
        </ThActionButton>

        <div className={styles.statusIndicator}>
          <span className={`${styles.statusText} ${isEnabled ? styles.enabled : styles.disabled}`}>
            {getStatusMessage()}
          </span>
          <div className={`${styles.statusDot} ${isEnabled ? styles.enabledDot : styles.disabledDot}`} />
        </div>
      </div>

      {!isEnabled && (
        <div className={styles.disabledNotice}>
          <small>🔇 To listen to the book, first enable TTS</small>
        </div>
      )}
    </div>
  );
};
