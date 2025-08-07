import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type {
    IContextualPlaybackAdapter,
    IAdapterConfig,
    ITextProcessor,
    ITTSError
} from '@/preferences/types';
import { TextChunk } from '@/types/tts';

export class ElevenLabsAdapter implements IContextualPlaybackAdapter {
    private readonly config: IAdapterConfig;
    private readonly textProcessor: ITextProcessor;
    private readonly eventListeners: Map<string, ((info: any) => void)[]> = new Map();

    // Audio state management
    private currentAudio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private isPaused: boolean = false;

    constructor(
        config: IAdapterConfig,
        textProcessor: ITextProcessor,
    ) {
        this.config = config;
        this.textProcessor = textProcessor;
    }

    async playWithContext(textChunk: TextChunk, previousRequestIds?: string[]): Promise<{
        requestId: string | null;
    }> {
        this.validateAndFormatText(textChunk.text);

        const combinedText = this.textProcessor.formatText(textChunk.text, textChunk.element || 'normal');

        try {
            this.cleanup();

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: combinedText,
                    voiceId: this.config.voiceId,
                    modelId: this.config.modelId,
                    useContext: true,
                    previousRequestIds: previousRequestIds
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            const requestId = response.headers.get("x-request-id");

            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);

            // Set up audio event listeners
            this.setupAudioEvents();

            // Start playback
            await this.currentAudio.play();
            this.isPlaying = true;
            this.isPaused = false;

            this.emitEvent('play', { audio: this.currentAudio });

            return { requestId };
        } catch (error) {
            const ttsError = this.createError('PLAYBACK_FAILED', 'Failed to generate audio with ElevenLabs', error);
            this.emitEvent('end', { success: false, error: ttsError });
            throw ttsError;
        }
    }

    async play<T = Buffer>(textChunk: TextChunk): Promise<T> {
        this.validateAndFormatText(textChunk.text);

        try {
            this.cleanup();

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: [textChunk],
                    voiceId: this.config.voiceId,
                    modelId: this.config.modelId,
                    useContext: true,
                    previousRequestIds: undefined
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const audioBlob = await response.blob();
            const requestId = response.headers.get("x-request-id");

            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudio = new Audio(audioUrl);

            // Set up audio event listeners
            this.setupAudioEvents();

            // Start playback
            await this.currentAudio.play();
            this.isPlaying = true;
            this.isPaused = false;

            this.emitEvent('play', { audio: this.currentAudio });

            return { requestId } as T;
        } catch (error) {
            const ttsError = this.createError('PLAYBACK_FAILED', 'Failed to generate audio with ElevenLabs', error);
            this.emitEvent('end', { success: false, error: ttsError });
            throw ttsError;
        }
    }

    pause(): void {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this.isPaused = true;
            this.emitEvent('pause', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio paused');
        } else {
            console.warn('ElevenLabsAdapter: No audio to pause or already paused');
        }
    }

    resume(): void {
        if (this.currentAudio && this.isPaused) {
            this.currentAudio.play().catch(error => {
                console.error('ElevenLabsAdapter: Resume failed:', error);
                this.emitEvent('error', { error });
            });
            this.isPlaying = true;
            this.isPaused = false;
            this.emitEvent('resume', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio resumed');
        } else {
            console.warn('ElevenLabsAdapter: No audio to resume or not paused');
        }
    }

    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.isPlaying = false;
            this.isPaused = false;
            this.emitEvent('stop', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio stopped');
        } else {
            console.warn('ElevenLabsAdapter: No audio to stop');
        }
    }

    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: any) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: any) => void): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // State getter methods
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    getIsPaused(): boolean {
        return this.isPaused;
    }

    getCurrentAudio(): HTMLAudioElement | null {
        return this.currentAudio;
    }

    private validateAndFormatText(text: string): void {
        if (!this.textProcessor.validateText(text)) {
            throw this.createError('INVALID_TEXT', 'Text validation failed');
        }
    }

    private emitEvent(event: string, info: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(info);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    private createError(code: string, message: string, details?: unknown): ITTSError {
        return {
            code,
            message,
            details: process.env.NODE_ENV === 'development' ? details : undefined
        };
    }

    // Setup audio event listeners
    private setupAudioEvents(): void {
        if (!this.currentAudio) return;

        this.currentAudio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.emitEvent('end', { success: true, audio: this.currentAudio });
        });

        this.currentAudio.addEventListener('error', (error) => {
            this.isPlaying = false;
            this.isPaused = false;
            this.emitEvent('error', { error, audio: this.currentAudio });
        });

        this.currentAudio.addEventListener('loadstart', () => {
            this.emitEvent('loadstart', { audio: this.currentAudio });
        });
    }

    // Cleanup audio resources
    private cleanup(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = '';
            this.currentAudio.load();
            this.currentAudio = null;
        }
        this.isPlaying = false;
        this.isPaused = false;
    }
}
