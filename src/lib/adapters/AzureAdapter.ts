import { IAdapterConfig, IPlaybackAdapter, ITextProcessor, ITTSError } from "@/preferences/types";
import { TextChunk } from "@/types/tts";

export class AzureAdapter implements IPlaybackAdapter {
    private readonly config: IAdapterConfig;
    private readonly textProcessor: ITextProcessor;
    private readonly eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();

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

    async play<T = Buffer>(textChunk: TextChunk): Promise<T> {
        console.warn("AzureAdapter: play method not implemented yet");
        return Promise.reject(new Error("AzureAdapter not implemented - use ElevenLabs for now"));
    }

    pause(): void {
        console.warn("AzureAdapter: pause method not implemented yet");
    }

    resume(): void {
        console.warn("AzureAdapter: resume method not implemented yet");
    }

    stop(): void {
        console.warn("AzureAdapter: stop method not implemented yet");
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    getIsPaused(): boolean {
        return this.isPaused;
    }

    getCurrentAudio(): HTMLAudioElement | null {
        return this.currentAudio;
    }

    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    destroy(): void {
        this.eventListeners.clear();
        console.log('AzureAdapter: Destroyed and cleaned up');
    }
}
