import { TextChunk, TTS_CONSTANTS } from '@/types/tts';
import { IContextualPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';

export interface ITtsOrchestrationService {
    startReading(): Promise<void>;
    pauseReading(): void;
    resumeReading(): void;
    stopReading(): void;
    isPlaying(): boolean;
    isPaused(): boolean;
    on(event: string, callback: (info: any) => void): void;
}

export class TtsOrchestrationService implements ITtsOrchestrationService {
    private requestIds: string[] = [];
    private eventListeners: Map<string, ((info: any) => void)[]> = new Map();

    constructor(
        private adapter: IContextualPlaybackAdapter,
        private textExtractor: ITextExtractionService
    ) {
        this.setupAdapterEvents();
    }

    async startReading(): Promise<void> {
        try {
            const chunks = await this.textExtractor.extractTextChunks();
            const chunksToSend = chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);

            console.log(`Starting TTS with ${chunksToSend.length} chunks`);
            this.requestIds = [];

            // Process chunks sequentially for context continuity
            for (let i = 0; i < chunksToSend.length; i++) {
                const textChunk = chunksToSend[i];

                console.log(`Processing chunk ${i + 1}/${chunksToSend.length}:`, {
                    element: textChunk.element,
                    text: textChunk.text?.substring(0, 50) + '...'
                });

                const result = await this.adapter.playWithContext(
                    textChunk,
                    this.requestIds.length > 0 ? this.requestIds : undefined
                );

                if (result.requestId) {
                    this.requestIds.push(result.requestId);
                }
            }

            this.emitEvent('reading-started', { chunks: chunksToSend });
        } catch (error) {
            console.error('TTS Orchestration: Failed to start reading', error);
            this.emitEvent('error', { error });
            throw error;
        }
    }

    pauseReading(): void {
        this.adapter.pause();
    }

    resumeReading(): void {
        this.adapter.resume();
    }

    stopReading(): void {
        this.adapter.stop();
        this.requestIds = [];
        this.emitEvent('reading-stopped', {});
    }

    isPlaying(): boolean {
        return this.adapter.getIsPlaying?.() || false;
    }

    isPaused(): boolean {
        return this.adapter.getIsPaused?.() || false;
    }

    on(event: string, callback: (info: any) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    private setupAdapterEvents(): void {
        this.adapter.on('play', (info) => {
            console.log('TTS Orchestration: Play started', info);
            this.emitEvent('play', info);
        });

        this.adapter.on('pause', (info) => {
            console.log('TTS Orchestration: Paused', info);
            this.emitEvent('pause', info);
        });

        this.adapter.on('resume', (info) => {
            console.log('TTS Orchestration: Resumed', info);
            this.emitEvent('resume', info);
        });

        this.adapter.on('stop', (info) => {
            console.log('TTS Orchestration: Stopped', info);
            this.requestIds = [];
            this.emitEvent('stop', info);
        });

        this.adapter.on('end', (info) => {
            console.log('TTS Orchestration: Ended', info);
            this.requestIds = [];
            this.emitEvent('end', info);
        });

        this.adapter.on('error', (info) => {
            console.error('TTS Orchestration: Error', info);
            this.emitEvent('error', info);
        });
    }

    private emitEvent(event: string, info: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(info);
                } catch (error) {
                    console.error(`Error in TTS orchestration event listener for ${event}:`, error);
                }
            });
        }
    }
}
