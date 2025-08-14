import { TextChunk } from "@/types/tts";

export interface IAudioPlayback {
    play<T = void>(text: TextChunk): Promise<T>;
    pause(): void;
    resume(): void;
    stop(): void;
    getIsPlaying?(): boolean;
    getIsPaused?(): boolean;
    getCurrentAudio?(): HTMLAudioElement | null;
}

export interface IPlaybackEvents {
    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void;
    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void;
}
export interface IVoiceProvider {
    getVoices(): Promise<VoiceInfo[]>;
    setVoice(voiceId: string): void;
}

export interface IPlaybackAdapter extends IAudioPlayback, IPlaybackEvents {
    // Optioneel voice management
    voices?: IVoiceProvider;
}

export interface IAdapterConfig {
    readonly apiKey: string;
    readonly voiceId: string;
    readonly modelId?: string;
}

export interface ITextProcessor {
    formatText(text: string, elementType: string): string;
    validateText(text: string): boolean;
}

export interface ITTSError {
    code: string;
    message: string;
    details?: unknown;
}

export interface IAdapterFactory {
    createAdapter(type: 'elevenlabs' | 'web-speech', config: IAdapterConfig): IPlaybackAdapter;
}

export interface VoiceInfo {
    id: string;
    name: string;
    language: string;
    gender?: 'male' | 'female' | 'neutral';
    quality?: 'standard' | 'premium';
}
