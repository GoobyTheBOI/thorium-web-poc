/**
 * Shared type definitions for adapter test files
 */

export type MockAudioElement = {
  play: jest.Mock;
  pause: jest.Mock;
  addEventListener?: jest.Mock;
  removeEventListener?: jest.Mock;
  src?: string;
  currentTime: number;
  duration: number;
  load?: jest.Mock;
};

export type MockTextProcessor = {
  formatText: jest.Mock;
  processText: jest.Mock;
  validateText: jest.Mock;
};

export type MockVoiceService = {
  getVoices?: jest.Mock;
  setVoice?: jest.Mock;
  getCurrentVoice?: jest.Mock;
  loadRediumVoices?: jest.Mock;
  loadElevenLabsVoices?: jest.Mock;
  loadAzureVoices?: jest.Mock;
  selectVoice?: jest.Mock;
  getSelectedVoice?: jest.Mock;
  getVoicesByGender?: jest.Mock;
  getCurrentVoiceGender?: jest.Mock;
};

// Base adapter with common private properties
export type BaseAdapterWithPrivates = {
  config: { apiKey: string; voiceId: string; modelId: string };
  textProcessor: MockTextProcessor;
  currentAudio: HTMLAudioElement | null;
  isPlaying: boolean;
  isPaused: boolean;
  eventListeners: Map<string, ((info: unknown) => void)[]>;
  updatePlaybackState: (isPlaying: boolean, isPaused: boolean) => void;
  emitEvent: (event: string, data: unknown) => void;
};

// Azure-specific adapter type
export type AzureAdapterWithPrivates = BaseAdapterWithPrivates & {
  cleanup: () => void;
};

// ElevenLabs-specific adapter type
export type ElevenLabsAdapterWithPrivates = BaseAdapterWithPrivates & {
  executePlayRequest: (config: unknown) => Promise<{ requestId: string | null; audio: HTMLAudioElement }>;
  validateAndFormatText: (input: unknown) => string;
};
