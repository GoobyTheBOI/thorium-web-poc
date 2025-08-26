import { TextChunk } from "@/types/tts";

export interface IAudioPlayback {
    play<T = void>(text: TextChunk): Promise<T>;
    pause(): void;
    resume(): void;
    stop(): void;
    destroy(): void;
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
    setVoice(voiceId: string): Promise<void>;
    getVoicesByGender?(gender: 'male' | 'female'): Promise<VoiceInfo[]>;
    getCurrentVoiceGender?(): Promise<'male' | 'female' | 'neutral' | null>;
}

export interface IPlaybackAdapter extends IAudioPlayback, IPlaybackEvents {
    voices?: IVoiceProvider;
}

export interface IAdapterConfig {
    readonly apiKey: string;
    voiceId: string;
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
}
