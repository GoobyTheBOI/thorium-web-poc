import { ITTSError } from '@/preferences/types';
import { TextChunk } from '@/types/tts';
import { createError } from './errorUtils';

export interface AudioPlaybackResult<T> {
    success: boolean;
    error?: ITTSError;
    result?: T;
}

export interface AudioPlaybackAdapter {
    setupAudioPlayback(audioBlob: Blob): Promise<HTMLAudioElement>;
    emitEvent(event: string, info: unknown): void;
    cleanup(): void;
}

export interface TextToAudioAdapter extends AudioPlaybackAdapter {
    playTextChunk(textChunk: TextChunk): Promise<any>;
}

/**
 * Shared function for handling pre-generated audio playback
 * Reduces code duplication between adapters
 */
async function playPreGeneratedAudio<T>(
    adapter: AudioPlaybackAdapter,
    audioBlob: Blob,
    successResult: T
): Promise<T> {
    adapter.cleanup();

    const audio = await adapter.setupAudioPlayback(audioBlob);

    return new Promise<T>((resolve, reject) => {
        const onEnd = () => {
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('error', onError);
            adapter.emitEvent('end', { success: true });
            resolve(successResult);
        };

        const onError = (error: Event) => {
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('error', onError);
            const ttsError = createError('PLAYBACK_FAILED', 'Audio playback failed', error);
            adapter.emitEvent('end', { success: false, error: ttsError });
            reject(ttsError);
        };

        audio.addEventListener('ended', onEnd);
        audio.addEventListener('error', onError);
    });
}

/**
 * Universal play function that handles both TextChunk and Blob inputs
 * This centralizes the instanceof check and routing logic
 */
export async function playUniversal<T>(
    adapter: TextToAudioAdapter,
    input: TextChunk | Blob,
    successResult: T
): Promise<T> {
    // Handle Blob input (pre-generated audio)
    if (input instanceof Blob) {
        return await playPreGeneratedAudio(adapter, input, successResult);
    }

    // Handle TextChunk input (generate and play)
    return await adapter.playTextChunk(input);
}
