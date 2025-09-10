import { TTS_CONSTANTS } from '@/types/tts';
import { IPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { TtsStateManager, TtsState } from '../managers/TtsStateManager';
import { createAdapter, AdapterType } from '../factories/AdapterFactory';
import { VoiceManagementService } from './VoiceManagementService';
import { TextChunk } from '@/types/tts';
import { extractErrorMessage } from '@/lib/utils/errorUtils';

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
    setMockTTS(enabled: boolean): void;
    isMockTTSEnabled(): boolean;
    destroy(): void;
}

export class TtsOrchestrationService implements ITtsOrchestrationService {
    private isExecuting: boolean = false;
    private isProcessingMultipleChunks: boolean = false;
    private callbacks: TtsCallbacks;
    private currentAdapterType: AdapterType | null = null;
    private useMockTTS: boolean = false;

    constructor(
        private adapter: IPlaybackAdapter,
        private textExtractor: ITextExtractionService,
        private stateManager: TtsStateManager,
        private voiceService: VoiceManagementService,
        initialAdapterType?: AdapterType,
        callbacks?: TtsCallbacks,
        useMockTTS?: boolean
    ) {
        this.callbacks = callbacks || {};
        this.currentAdapterType = initialAdapterType || null;
        this.useMockTTS = useMockTTS ?? TTS_CONSTANTS.ENABLE_MOCK_TTS;

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

        const filteredChunks = TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING
            ? chunks
            : chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);

        return filteredChunks;
    }

    /**
     * Processes multiple text chunks sequentially using the adapter's play method.
     */
    private async processAllChunks(chunks: TextChunk[]): Promise<void> {
        this.isProcessingMultipleChunks = chunks.length > 1;

        // Process chunks sequentially using the adapter's play method
        for (let i = 0; i < chunks.length; i++) {
            if (!this.isExecuting) {
                break;
            }

            await this.playChunkDirectly(chunks[i], i + 1);
            this.handleStateTransitionAfterFirstChunk(i);
        }
    }

    /**
     * Handle completion of current page and potentially navigate to next page.
     */
    private async handlePageCompletion(): Promise<void> {
        try {
            const hasNextPage = await this.textExtractor.hasNextPage();
            if (!hasNextPage) {
                return;
            }

            const navigated = await this.textExtractor.navigateToNextPage();
            if (!navigated) {
                return;
            }

            await this.waitForPageLoad();
            await this.continueReadingNewPage();
        } catch (error) {
            this.handleExecutionError(error);
        }
    }

    /**
     * Continue reading from the newly loaded page.
     */
    private async continueReadingNewPage(): Promise<void> {
        try {
            const newPageChunks = await this.textExtractor.extractTextChunks();
            if (newPageChunks.length === 0) {
                return;
            }

            // Process new page chunks sequentially
            for (let i = 0; i < newPageChunks.length; i++) {
                if (!this.isExecuting) {
                    break;
                }
                await this.playChunkDirectly(newPageChunks[i], i + 1);
            }
        } catch (error) {
            this.handleExecutionError(error);
        }
    }

    /**
     * Wait for page to load after navigation.
     */
    private async waitForPageLoad(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 1000));

        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const readerElement = this.textExtractor.getCurrentReaderElement();
            if (readerElement && readerElement.textContent?.trim()) {
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }
    }

    /**
     * Handle the state transition from "generating" to "playing" after the first chunk starts.
     */
    private handleStateTransitionAfterFirstChunk(chunkIndex: number): void {
        if (chunkIndex === 0) {
            this.stateManager.setGenerating(false);
        }
    }

    /**
     * Play a single chunk directly using the adapter's play method.
     */
    private async playChunkDirectly(chunk: TextChunk, chunkNumber: number): Promise<void> {
        try {
            if (this.useMockTTS) {
                // For mock TTS, generate and play mock audio
                const mockBlob = this.generateMockAudio(chunk);
                await this.adapter.play(mockBlob);
            } else {
                // Use the adapter's play method directly with TextChunk
                await this.adapter.play(chunk);
            }
        } catch (error) {
            this.handleExecutionError(error);
        }
    }

    /**
     * Generate mock audio blob for testing purposes.
     */
    private generateMockAudio(chunk: TextChunk): Blob {
        const text = chunk.text || '';
        const duration = Math.max(1, Math.min(3, text.length / 30));
        const sampleRate = 22050;
        const samples = Math.floor(sampleRate * duration);

        const frequency = 440 + (this.simpleHash(text) % 5) * 50;
        const audioData = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.2;
        }

        const wavBuffer = this.createWavBuffer(audioData, sampleRate);
        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    private createWavBuffer(audioData: Float32Array, sampleRate: number): ArrayBuffer {
        const length = audioData.length;
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);

        // WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length * 2, true);

        // Audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, audioData[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    private writeString(view: DataView, offset: number, string: string): void {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    /**
     * Play pre-generated audio blob using the adapter.
     */
    private async playPreGeneratedAudio(audioBlob: Blob, chunk: TextChunk): Promise<void> {
        await this.adapter.play(audioBlob);
    }

    private handleExecutionError(error: unknown): void {
        console.error('TTS Orchestration: Failed to start reading', error);

        const errorMessage = extractErrorMessage(error, 'Failed to start reading');

        this.stateManager.setError(errorMessage);
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
        return this.stateManager.getState().isPlaying;
    }

    isPaused(): boolean {
        return this.stateManager.getState().isPaused;
    }

    getState(): TtsState {
        return this.stateManager.getState();
    }

    // Mock TTS control methods
    setMockTTS(enabled: boolean): void {
        this.useMockTTS = enabled;
    }

    isMockTTSEnabled(): boolean {
        return this.useMockTTS;
    }

    // Adapter management methods
    switchAdapter(adapterType?: AdapterType): void {
        let targetAdapter: AdapterType;

        if (adapterType) {
            targetAdapter = adapterType;
        } else {
            // Cycle to the next adapter
            targetAdapter = this.currentAdapterType === 'elevenlabs' ? 'azure' : 'elevenlabs';
        }

        this.callbacks.onAdapterSwitch?.(targetAdapter);
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
}
