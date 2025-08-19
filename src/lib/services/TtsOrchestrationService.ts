import { TTS_CONSTANTS } from '@/types/tts';
import { IPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { TtsStateManager, TtsState } from '../managers/TtsStateManager';
import { TTSAdapterFactory, AdapterType } from '../AdapterFactory';

export interface TtsCallbacks {
    onStateChange?: (state: TtsState) => void;
    onError?: (error: string) => void;
    onAdapterSwitch?: (newAdapter: AdapterType) => void;
}

export interface ITtsOrchestrationService {
    startReading(): Promise<void>;
    pauseReading(): void;
    resumeReading(): void;
    stopReading(): void;
    isPlaying(): boolean;
    isPaused(): boolean;
    switchAdapter(adapterType?: AdapterType): void;
    getCurrentAdapterType(): AdapterType | null;
    getState(): TtsState;
    destroy(): void;
}

export class TtsOrchestrationService implements ITtsOrchestrationService {
    private stateManager: TtsStateManager;
    private isExecuting: boolean = false;
    private adapterFactory: TTSAdapterFactory;
    private callbacks: TtsCallbacks;
    private currentAdapterType: AdapterType | null = null;

    constructor(
        private adapter: IPlaybackAdapter,
        private textExtractor: ITextExtractionService,
        initialAdapterType?: AdapterType,
        callbacks?: TtsCallbacks
    ) {
        this.stateManager = new TtsStateManager();
        this.adapterFactory = new TTSAdapterFactory();
        this.callbacks = callbacks || {};
        this.currentAdapterType = initialAdapterType || null;

        // Set initial state
        if (initialAdapterType) {
            this.stateManager.setAdapter(initialAdapterType);
        }

        this.setupAdapterCallbacks();
        this.setupStateSubscription();
    }

    async startReading(): Promise<void> {
        if (this.isExecuting || this.isPlaying()) {
            console.log('TTS: Already executing or playing');
            return;
        }

        this.isExecuting = true;
        this.stateManager.setGenerating(true);

        try {
            const chunks = await this.textExtractor.extractTextChunks();
            // Choose reading mode based on configuration
            const chunksToSend = TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING
                ? chunks
                : chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);

            console.log(`Starting TTS with ${chunksToSend.length} chunks`);

            for (let i = 0; i < chunksToSend.length; i++) {
                const textChunk = chunksToSend[i];
                console.log(`Processing chunk ${i + 1}/${chunksToSend.length}`);
                await this.adapter.play(textChunk);
            }

        } catch (error) {
            console.error('TTS Orchestration: Failed to start reading', error);
            this.stateManager.setError(`Failed to start reading: ${error}`);
            throw error;
        } finally {
            this.isExecuting = false;
            this.stateManager.setGenerating(false);
        }
    }

    pauseReading(): void {
        if (!this.isPlaying() || this.isPaused()) {
            console.log('TTS: Not playing or already paused');
            return;
        }
        this.adapter.pause();
        console.log('TTS: Paused');
    }

    resumeReading(): void {
        if (!this.isPaused()) {
            console.log('TTS: Not paused');
            return;
        }
        this.adapter.resume();
        console.log('TTS: Resumed');
    }

    stopReading(): void {
        if (!this.isPlaying() && !this.isPaused()) {
            console.log('TTS: Not playing or paused');
            return;
        }
        this.adapter.stop();
        this.isExecuting = false;
        console.log('TTS: Stopped');
    }

    isPlaying(): boolean {
        return this.adapter.getIsPlaying?.() || false;
    }

    isPaused(): boolean {
        return this.adapter.getIsPaused?.() || false;
    }

    switchAdapter(adapterType?: AdapterType): void {
        const implementedAdapters = TTSAdapterFactory.getImplementedAdapters();

        if (adapterType) {
            const targetAdapter = implementedAdapters.find(a => a.key === adapterType);
            if (!targetAdapter) {
                console.warn(`Adapter ${adapterType} not found or not implemented`);
                return;
            }
            this.performAdapterSwitch(adapterType);
        } else {
            const currentIndex = implementedAdapters.findIndex(a => a.key === this.currentAdapterType);
            const nextIndex = (currentIndex + 1) % implementedAdapters.length;
            const nextAdapterType = implementedAdapters[nextIndex].key as AdapterType;
            this.performAdapterSwitch(nextAdapterType);
        }
    }

    getCurrentAdapterType(): AdapterType | null {
        return this.currentAdapterType;
    }

    getState(): TtsState {
        return this.stateManager.getState();
    }

    destroy(): void {
        console.log('TTS Orchestration Service: Destroying');
        this.stopReading();
    }

    private setupAdapterCallbacks(): void {
        this.adapter.on('play', () => {
            this.stateManager.setPlaying(true);
        });

        this.adapter.on('pause', () => {
            this.stateManager.setPaused(true);
        });

        this.adapter.on('resume', () => {
            this.stateManager.setPlaying(true);
        });

        this.adapter.on('stop', () => {
            this.stateManager.reset();
            this.isExecuting = false;
        });

        this.adapter.on('end', () => {
            this.stateManager.reset();
            this.isExecuting = false;
        });

        this.adapter.on('error', (info: unknown) => {
            const errorInfo = info as { error?: { message?: string } };
            const errorMessage = `TTS Error: ${errorInfo.error?.message || 'Unknown error'}`;
            this.stateManager.setError(errorMessage);
            this.isExecuting = false;
        });
    }

    private setupStateSubscription(): void {
        this.stateManager.subscribe((state) => {
            this.callbacks.onStateChange?.(state);
        });
    }

    private performAdapterSwitch(newAdapterType: AdapterType): void {
        if (newAdapterType === this.currentAdapterType) {
            console.log(`Already using ${newAdapterType} adapter`);
            return;
        }

        this.stopReading();

        try {
            const newAdapter = this.adapterFactory.createAdapter(newAdapterType);

            // Clean up old adapter
            try {
                this.adapter.destroy?.();
            } catch (error) {
                console.warn('Error cleaning up old adapter:', error);
            }

            this.adapter = newAdapter;
            this.currentAdapterType = newAdapterType;
            this.stateManager.setAdapter(newAdapterType);

            this.setupAdapterCallbacks();

            console.log(`Switched to ${newAdapterType} adapter`);
            this.callbacks.onAdapterSwitch?.(newAdapterType);

        } catch (error) {
            console.error(`Failed to switch to ${newAdapterType} adapter:`, error);
            this.stateManager.setError(`Failed to switch adapter: ${error}`);
        }
    }
}
