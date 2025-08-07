import { TextChunk } from "@/types/tts";

// Basis audio interface
export interface IAudioPlayback {
    play<T = void>(text: TextChunk): Promise<T>;
    pause(): void;
    resume(): void;
    stop(): void;
    // State getters
    getIsPlaying?(): boolean;
    getIsPaused?(): boolean;
    getCurrentAudio?(): HTMLAudioElement | null;
}

// Event handling interface (extended for better control)
export interface IPlaybackEvents {
    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: any) => void): void;
    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: any) => void): void;
}

// Voice management interface
export interface IVoiceProvider {
    getVoices(): Promise<VoiceInfo[]>;
    setVoice(voiceId: string): void;
}

// Combinatie interface voor volledige playback functionaliteit
export interface IPlaybackAdapter extends IAudioPlayback, IPlaybackEvents {
    // Optioneel voice management
    voices?: IVoiceProvider;
}

// Context-aware uitbreiding
export interface IContextualPlaybackAdapter extends IPlaybackAdapter {
    playWithContext<T = Buffer>(textChunk: TextChunk, requestIds?: string[]): Promise<{
        requestId: string | null;
    }>;
}

// Configuratie abstractions
export interface IAdapterConfig {
    readonly apiKey: string;
    readonly voiceId: string;
    readonly modelId?: string;
}

export interface ITextProcessor {
    formatText(text: string, elementType: string): string;
    validateText(text: string): boolean;
}

// Error handling
export interface ITTSError {
    code: string;
    message: string;
    details?: unknown;
}

// Factory pattern voor adapters
export interface IAdapterFactory {
    createAdapter(type: 'elevenlabs' | 'web-speech', config: IAdapterConfig): IContextualPlaybackAdapter;
}

// Voice information
export interface VoiceInfo {
    id: string;
    name: string;
    language: string;
    gender?: 'male' | 'female' | 'neutral';
    quality?: 'standard' | 'premium';
}
