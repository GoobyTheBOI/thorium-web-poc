import { VoiceInfo } from '@/preferences/types';
import { TextChunk } from '@/types/tts';

/**
 * Interface Segregation - Kleinere, specifieke interfaces
 */

// Core playback functionality
export interface IPlaybackCore {
    play(input: TextChunk | Blob): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
}

// Playback state management
export interface IPlaybackState {
    getIsPlaying(): boolean;
    getIsPaused(): boolean;
    getCurrentAudio(): HTMLAudioElement | null;
}

// Event handling capability
export interface IEventEmitter {
    on(event: string, callback: (info: unknown) => void): void;
    off(event: string, callback: (info: unknown) => void): void;
}

// Resource cleanup
export interface IDisposable {
    destroy(): void;
}

// Voice querying capabilities
export interface IVoiceQuery {
    getAvailableVoices(): Promise<VoiceInfo[]>;
    getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]>;
    getCurrentVoice(): string | null;
    getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null>;
}

// Voice selection capabilities
export interface IVoiceSelection {
    selectVoice(voiceId: string): Promise<void>;
    setVoiceByGender(gender: 'male' | 'female'): Promise<void>;
}

/**
 * Composed interfaces voor specifieke use cases
 */

// Voor basic TTS playback zonder voice management
export interface IBasicTTSAdapter extends IPlaybackCore, IEventEmitter, IDisposable {}

// Voor volledige TTS adapter met voice support
export interface IAdvancedTTSAdapter extends IBasicTTSAdapter, IPlaybackState, IVoiceQuery, IVoiceSelection {}

// Voor alleen voice management
export interface IVoiceManager extends IVoiceQuery, IVoiceSelection {}

// Voor TTS controllers
export interface ITTSController extends IPlaybackCore, IVoiceQuery, IVoiceSelection, IEventEmitter, IDisposable {
    initialize(): Promise<void>;
}

/**
 * Type guards voor runtime interface checking
 */
export function hasVoiceSupport(adapter: IBasicTTSAdapter): adapter is IAdvancedTTSAdapter {
    return 'getAvailableVoices' in adapter && 'selectVoice' in adapter;
}

export function hasStateSupport(adapter: IBasicTTSAdapter): adapter is IBasicTTSAdapter & IPlaybackState {
    return 'getIsPlaying' in adapter && 'getIsPaused' in adapter;
}

/**
 * Factory function voor het maken van adapters met alleen benodigde interfaces
 */
export type AdapterCapabilities = {
    voiceSupport?: boolean;
    stateSupport?: boolean;
    eventSupport?: boolean;
};

export function createTTSAdapter(): IBasicTTSAdapter | IAdvancedTTSAdapter {
    // Factory logic hier - returns adapter met alleen benodigde interfaces
    // Dit voorkomt Interface Segregation violations
    throw new Error('Not implemented - example of ISP design');
}
