// This file defines all the interfaces used by TTS adapters and TTS functionality

export interface TextChunk {
    text: string;
    element?: string;
}

export interface TTSRequestBody {
    text: string;
    voiceId: string;
    modelId?: string;
    useContext?: boolean;
}

export interface TTSErrorResponse {
    error: string;
    details?: string;
}

export type ElementType = 'heading' | 'paragraph' | 'italic' | 'bold' | 'normal' | 'code';

export interface TtsPlaybackResult {
    audioBuffer: Buffer;
    requestId: string | null;
}

export interface IAudioPlayback {
    startPlayback(data: ArrayBuffer): void;
    stopPlayback(): void;
    isPlaying: boolean;
}

export interface IPlaybackAdapter {
    processTextChunk(chunk: TextChunk): Promise<ArrayBuffer>;
}

export interface VoiceInfo {
    id: string;
    name: string;
    language: string;
    gender?: 'male' | 'female' | 'neutral';
    isDefault?: boolean;
}

export interface IVoiceProvider {
    getVoices(): Promise<VoiceInfo[]>;
    setVoice(voiceId: string): Promise<void>;
    getVoicesByGender?(gender: 'male' | 'female'): Promise<VoiceInfo[]>;
    getCurrentVoiceGender?(): Promise<'male' | 'female' | 'neutral' | null>;
}

export interface IAdapterConfig {
    readonly apiKey: string;
    voiceId: string;
    readonly modelId?: string;
    useContext?: boolean;
}

export interface IPlaybackEvents {
    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void;
    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void;
}

export interface IPlaybackAdapter extends IAudioPlayback, IPlaybackEvents {
    voices?: IVoiceProvider;
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
