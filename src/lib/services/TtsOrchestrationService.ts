import { TTS_CONSTANTS } from '@/types/tts';
import { IPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { TtsStateManager, TtsState } from '../managers/TtsStateManager';
import { createAdapter, AdapterType } from '../factories/AdapterFactory';
import { VoiceManagementService } from './VoiceManagementService';
import { TextChunk } from '@/types/tts';

// Constants for TTS error detection
const TTS_ERROR_KEYWORDS = ['TTS', 'audio', 'speech', 'voice'];

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
    private isExecuting: boolean = false;
    private isProcessingMultipleChunks: boolean = false;
    private callbacks: TtsCallbacks;
    private currentAdapterType: AdapterType | null = null;

    constructor(
        private adapter: IPlaybackAdapter,
        private textExtractor: ITextExtractionService,
        private stateManager: TtsStateManager,
        private voiceService: VoiceManagementService,
        initialAdapterType?: AdapterType,
        callbacks?: TtsCallbacks
    ) {
        this.callbacks = callbacks || {};
        this.currentAdapterType = initialAdapterType || null;

        // Set initial state
        if (initialAdapterType) {
            this.stateManager.setAdapter(initialAdapterType);
        }

        this.setupAdapterCallbacks();
        this.setupStateSubscription();
    }

    /**
     * Starts reading the text chunks sequentially using the configured adapter.
     * Sets state to "generating" initially, then transitions to "playing" after first chunk.
     */
    async startReading(): Promise<void> {
        if (this.isAlreadyRunning()) {
            return;
        }

        // Ensure we start with a clean state
        this.forceCleanup();
        this.initializeExecution();

        try {
            const chunks = await this.prepareTextChunks();
            await this.processAllChunks(chunks);
            this.handleSuccessfulCompletion();
        } catch (error) {
            this.handleExecutionError(error);
        } finally {
            this.cleanupExecution();
        }
    }

    private initializeExecution(): void {
        this.isExecuting = true;
        this.stateManager.setGenerating(true);
    }

    private async prepareTextChunks(): Promise<TextChunk[]> {
        const chunks = await this.textExtractor.extractTextChunks();
        return TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING
            ? chunks
            : chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);
    }

    /**
     * Processes multiple text chunks sequentially, ensuring each chunk completes
     * before moving to the next one. Handles state transitions appropriately.
     */
    private async processAllChunks(chunks: TextChunk[]): Promise<void> {
        this.isProcessingMultipleChunks = chunks.length > 1;

        for (let i = 0; i < chunks.length; i++) {
            if (!this.isExecuting) {
                break;
            }

            await this.processChunk(chunks[i], i + 1, chunks.length);

            // Transition from "generating" to "playing" after first chunk
            if (i === 0) {
                this.stateManager.setGenerating(false);
            }
        }
    }    private async processChunk(chunk: TextChunk, index: number, total: number): Promise<void> {
        await this.adapter.play(chunk);
    }

    private handleExecutionError(error: unknown): void {
        console.error('TTS Orchestration: Failed to start reading', error);
        this.stateManager.setError(`Failed to start reading: ${error}`);
        throw error;
    }

    private cleanupExecution(): void {
        this.isExecuting = false;
        this.isProcessingMultipleChunks = false;
        this.stateManager.setGenerating(false);
    }

    /**
     * Force cleanup to ensure we start with a clean state.
     * This prevents multiple audio instances from playing simultaneously.
     */
    private forceCleanup(): void {
        this.isExecuting = false;
        this.isProcessingMultipleChunks = false;

        // Stop any current playback and clean up
        if (this.adapter && (this.adapter.getIsPlaying?.() || this.adapter.getIsPaused?.())) {
            this.adapter.stop();
        }
    }

    // Public control methods
    pauseReading(): void {
        if (this.cannotPause()) {
            return;
        }
        this.adapter.pause();
    }

    resumeReading(): void {
        if (this.cannotResume()) {
            return;
        }
        this.adapter.resume();
    }

    stopReading(): void {
        if (this.cannotStop()) {
            return;
        }

        // Stop execution and cleanup state before stopping adapter
        this.isExecuting = false;
        this.isProcessingMultipleChunks = false;

        this.adapter.stop();
    }

    // State query methods
    isPlaying(): boolean {
        return this.adapter.getIsPlaying?.() || false;
    }

    isPaused(): boolean {
        return this.adapter.getIsPaused?.() || false;
    }

    getState(): TtsState {
        return this.stateManager.getState();
    }

    // Adapter management methods
    switchAdapter(adapterType?: AdapterType): void {
        this.callbacks.onAdapterSwitch?.(adapterType || 'elevenlabs');
    }

    getCurrentAdapterType(): AdapterType | null {
        return this.currentAdapterType;
    }

    destroy(): void {
        // Always stop the adapter during cleanup, regardless of current state
        this.adapter.stop();
        this.isExecuting = false;
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
            this.isProcessingMultipleChunks = false;
        });

        // Handle adapter events with proper error filtering
        this.adapter.on('end', () => {
            if (this.shouldResetOnEnd()) {
                this.stateManager.reset();
            }
        });

        this.adapter.on('error', (info: unknown) => {
            this.handleAdapterError(info);
        });
    }

    private handleAdapterError(info: unknown): void {
        const errorInfo = info as { error?: { message?: string } };
        const errorMessage = `TTS Error: ${errorInfo.error?.message || 'Unknown error'}`;

        if (this.shouldStopOnError(errorInfo)) {
            this.handleTtsError(errorMessage);
        }
    }

    private setupStateSubscription(): void {
        this.stateManager.subscribe((state) => {
            this.callbacks.onStateChange?.(state);
        });
    }

    private isAlreadyRunning(): boolean {
        return this.isExecuting || this.isPlaying();
    }

    private cannotPause(): boolean {
        return !this.isPlaying() || this.isPaused();
    }

    private cannotResume(): boolean {
        return !this.isPaused();
    }

    private cannotStop(): boolean {
        return !this.isPlaying() && !this.isPaused();
    }

    private shouldResetOnEnd(): boolean {
        return !this.isProcessingMultipleChunks && !this.isExecuting;
    }

    private isAlreadyUsingAdapter(adapterType: AdapterType): boolean {
        return adapterType === this.currentAdapterType;
    }

    private handleSuccessfulCompletion(): void {
        if (!this.isExecuting) return;

        this.isProcessingMultipleChunks = false;
        this.isExecuting = false;
        this.stateManager.reset();
    }

    private shouldStopOnError(errorInfo: { error?: { message?: string } }): boolean {
        return this.isTtsRelatedError(errorInfo) || !this.isProcessingMultipleChunks;
    }

    private isTtsRelatedError(errorInfo: { error?: { message?: string } }): boolean {
        const message = errorInfo.error?.message;
        if (!message) return false;

        return TTS_ERROR_KEYWORDS.some(keyword => message.includes(keyword));
    }

    private handleTtsError(errorMessage: string): void {
        this.stateManager.setError(errorMessage);
        this.resetExecutionState();
    }

    private resetExecutionState(): void {
        this.isExecuting = false;
        this.isProcessingMultipleChunks = false;
    }

    private performAdapterSwitch(newAdapterType: AdapterType): void {
        if (this.isAlreadyUsingAdapter(newAdapterType)) {
            console.log(`Already using ${newAdapterType} adapter`);
            return;
        }

        this.stopReading();

        try {
            const newAdapter = createAdapter(newAdapterType, this.voiceService);

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
