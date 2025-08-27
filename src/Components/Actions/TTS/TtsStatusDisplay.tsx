import React from 'react';
import { TtsState } from '@/lib/managers/TtsStateManager';
import { KeyboardShortcut } from '@/lib/handlers/KeyboardHandler';
import styles from '@/app/epub/actions/tts/ActivateTtsContainer.module.css';

export interface TtsStatusDisplayProps {
  ttsState: TtsState;
  voicesError: string | null;
  keyboardShortcuts: KeyboardShortcut[];
}

export const TtsStatusDisplay: React.FC<TtsStatusDisplayProps> = ({
  ttsState,
  voicesError,
  keyboardShortcuts
}) => {
  const getStatusMessage = (): string => {
    if (ttsState.isGenerating) return "Generating audio...";
    if (ttsState.isPlaying) return "Playing with SOLID architecture";
    if (ttsState.isPaused) return "Paused";
    return "Ready";
  };

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('Ctrl');
    if (shortcut.altKey) modifiers.push('Alt');
    if (shortcut.shiftKey) modifiers.push('Shift');

    const key = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
    return `${modifiers.join('+')}${modifiers.length > 0 ? '+' : ''}${key}`;
  };

  return (
    <>
      {voicesError && (
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>
            Error: {voicesError}
          </p>
        </div>
      )}

      <div className={styles.statusContainer}>
        <p className={styles.statusText}>
          Status: {getStatusMessage()}
        </p>
      </div>

      {/* Keyboard Shortcuts Section */}
      <div className={styles.shortcutsContainer}>
        <h4 className={styles.shortcutsTitle}>
          Keyboard Shortcuts:
        </h4>
        {keyboardShortcuts.map((shortcut, index) => (
          <div key={index} className={styles.shortcutItem}>
            <span>{shortcut.description}:</span>
            <code className={styles.shortcutCode}>
              {formatShortcut(shortcut)}
            </code>
          </div>
        ))}
      </div>
    </>
  );
};
