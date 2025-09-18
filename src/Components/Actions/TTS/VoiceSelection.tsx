import React from 'react';
import { Select } from '@/Components/UI/Select';
import { VoiceInfo } from '@/preferences/types';
import { getLanguageDisplay, getGenderDisplay } from '@/Components/Actions/TTS/constants/voiceConstants';

interface VoiceSelectionProps {
  voices: VoiceInfo[];
  selectedVoice: string | null;
  onVoiceChange: (voiceId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

interface GroupedVoices {
  [language: string]: {
    [gender: string]: VoiceInfo[];
  };
}

export const VoiceSelection: React.FC<VoiceSelectionProps> = ({
  voices,
  selectedVoice,
  onVoiceChange,
  disabled = false,
  loading = false,
  error = null,
}) => {
  // Group voices by language and then by gender
  const groupedVoices = React.useMemo((): GroupedVoices => {
    return voices.reduce((acc, voice) => {
      const language = voice.language || "unknown";
      const gender = voice.gender || "neutral";

      if (!acc[language]) {
        acc[language] = {};
      }
      if (!acc[language][gender]) {
        acc[language][gender] = [];
      }

      acc[language][gender].push(voice);
      return acc;
    }, {} as GroupedVoices);
  }, [voices]);

  if (loading) {
    return (
      <Select
        label="Voice Selection"
        placeholder="Loading voices..."
        loading={true}
        disabled={true}
      />
    );
  }

  if (error) {
    return (
      <Select
        label="Voice Selection"
        placeholder="Error loading voices"
        disabled={true}
        error={error}
      />
    );
  }

  if (voices.length === 0) {
    return (
      <Select
        label="Voice Selection"
        placeholder="No voices available"
        disabled={true}
      />
    );
  }

  return (
    <Select
      label="Voice Selection"
      placeholder="Choose a voice..."
      value={selectedVoice || ""}
      onChange={onVoiceChange}
      disabled={disabled}
    >
      {Object.entries(groupedVoices).map(([language, genderGroups]) => {
        if (Object.keys(genderGroups).length === 1) {
          const [gender, voicesInGroup] = Object.entries(genderGroups)[0];
          const { emoji } = getGenderDisplay(gender);

          return (
            <optgroup key={language} label={getLanguageDisplay(language)}>
              {voicesInGroup.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {emoji} {voice.name}
                </option>
              ))}
            </optgroup>
          );
        }

        return Object.entries(genderGroups).map(([gender, voicesInGroup]) => {
          const { emoji, label } = getGenderDisplay(gender);
          const languageDisplay = getLanguageDisplay(language);

          return (
            <optgroup
              key={`${language}-${gender}`}
              label={`${languageDisplay} - ${emoji} ${label}`}
            >
              {voicesInGroup.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </optgroup>
          );
        });
      })}
    </Select>
  );
};

export default VoiceSelection;
