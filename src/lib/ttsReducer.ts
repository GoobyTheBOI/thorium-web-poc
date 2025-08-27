import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AdapterType, AdapterInfo } from "@/lib/factories/AdapterFactory";
import { VoiceInfo } from "@/preferences/types";

export interface TtsReducerState {
  selectedAdapterType: AdapterType;
  availableAdapters: AdapterInfo[];
  isRecreatingServices: boolean;
  voices: VoiceInfo[];
  selectedVoice: string | null;
  isLoadingVoices: boolean;
  voicesError: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isGenerating: boolean;
  error: string | null;
}

const initialState: TtsReducerState = {
  // Adapter State
  selectedAdapterType: 'elevenlabs',
  availableAdapters: [],
  isRecreatingServices: false,

  // Voice State
  voices: [],
  selectedVoice: null,
  isLoadingVoices: true,
  voicesError: null,

  // TTS State
  isPlaying: false,
  isPaused: false,
  isGenerating: false,
  error: null,
};

const ttsReducer = createSlice({
  name: "tts",
  initialState,
  reducers: {
    // Adapter Actions
    setSelectedAdapterType: (state, action: PayloadAction<AdapterType>) => {
      state.selectedAdapterType = action.payload;
    },

    setAvailableAdapters: (state, action: PayloadAction<AdapterInfo[]>) => {
      state.availableAdapters = action.payload;
    },

    setIsRecreatingServices: (state, action: PayloadAction<boolean>) => {
      state.isRecreatingServices = action.payload;
    },

    // Voice Actions
    setVoices: (state, action: PayloadAction<VoiceInfo[]>) => {
      state.voices = action.payload;
    },

    setSelectedVoice: (state, action: PayloadAction<string | null>) => {
      state.selectedVoice = action.payload;
    },

    setIsLoadingVoices: (state, action: PayloadAction<boolean>) => {
      state.isLoadingVoices = action.payload;
    },

    setVoicesError: (state, action: PayloadAction<string | null>) => {
      state.voicesError = action.payload;
    },

    // TTS Actions
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },

    setIsPaused: (state, action: PayloadAction<boolean>) => {
      state.isPaused = action.payload;
    },

    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Complex Actions (combining multiple state updates)
    startVoiceLoading: (state) => {
      state.isLoadingVoices = true;
      state.voicesError = null;
    },

    finishVoiceLoading: (state, action: PayloadAction<{ voices: VoiceInfo[], selectedVoice?: string | null }>) => {
      state.voices = action.payload.voices;
      state.selectedVoice = action.payload.selectedVoice || null;
      state.isLoadingVoices = false;
      state.voicesError = null;
    },

    voiceLoadingFailed: (state, action: PayloadAction<string>) => {
      state.voicesError = action.payload;
      state.isLoadingVoices = false;
    },

    startAdapterSwitch: (state, action: PayloadAction<AdapterType>) => {
      state.isRecreatingServices = true;
      state.selectedAdapterType = action.payload;
      state.voicesError = null;
    },

    finishAdapterSwitch: (state) => {
      state.isRecreatingServices = false;
    },

    adapterSwitchFailed: (state, action: PayloadAction<string>) => {
      state.isRecreatingServices = false;
      state.voicesError = action.payload;
    },

    // Reset actions
    resetTtsState: (state) => {
      state.isPlaying = false;
      state.isPaused = false;
      state.isGenerating = false;
      state.error = null;
    },

    resetVoiceState: (state) => {
      state.voices = [];
      state.selectedVoice = null;
      state.isLoadingVoices = true;
      state.voicesError = null;
    },
  },
});

export const {
  // Adapter Actions
  setSelectedAdapterType,
  setAvailableAdapters,
  setIsRecreatingServices,

  // Voice Actions
  setVoices,
  setSelectedVoice,
  setIsLoadingVoices,
  setVoicesError,

  // TTS Actions
  setIsPlaying,
  setIsPaused,
  setIsGenerating,
  setError,

  // Complex Actions
  startVoiceLoading,
  finishVoiceLoading,
  voiceLoadingFailed,
  startAdapterSwitch,
  finishAdapterSwitch,
  adapterSwitchFailed,

  // Reset Actions
  resetTtsState,
  resetVoiceState,
} = ttsReducer.actions;

export default ttsReducer.reducer;
