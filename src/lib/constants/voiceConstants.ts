export const LANGUAGE_DISPLAY_NAMES: { [key: string]: string } = {
  'nl': '🇳🇱 Dutch (Nederlands)',
  'en': '🇺🇸 English',
  'es': '🇪🇸 Spanish (Español)',
  'fr': '🇫🇷 French (Français)',
  'de': '🇩🇪 German (Deutsch)',
  'it': '🇮🇹 Italian (Italiano)',
  'pt': '🇵🇹 Portuguese (Português)',
  'unknown': '🌐 Unknown Language'
};

export const GENDER_DISPLAY_MAP: { [key: string]: { emoji: string; label: string } } = {
  'male': { emoji: '👨', label: 'Male' },
  'female': { emoji: '👩', label: 'Female' },
  'neutral': { emoji: '🔄', label: 'Neutral' },
  'default': { emoji: '🎭', label: 'Other' }
};

export function getLanguageDisplay(languageCode: string): string {
  return LANGUAGE_DISPLAY_NAMES[languageCode.toLowerCase()] || `🌐 ${languageCode.toUpperCase()}`;
}

export function getGenderDisplay(gender: string): { emoji: string; label: string } {
  return GENDER_DISPLAY_MAP[gender] || GENDER_DISPLAY_MAP.default;
}
