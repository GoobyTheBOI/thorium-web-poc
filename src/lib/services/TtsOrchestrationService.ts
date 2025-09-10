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
        console.log('TTS Orchestration: Extracting text chunks...');
        const chunks = await this.textExtractor.extractTextChunks();
        
        const filteredChunks = TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING
            ? chunks
            : chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);
            
        console.log(`TTS Orchestration: Extracted ${chunks.length} total chunks, using ${filteredChunks.length} chunks (ENABLE_WHOLE_PAGE_READING: ${TTS_CONSTANTS.ENABLE_WHOLE_PAGE_READING})`);
        
        filteredChunks.forEach((chunk, index) => {
            console.log(`Chunk ${index + 1}: "${chunk.text?.substring(0, 50)}..." (element: ${chunk.element})`);
        });
        
        return filteredChunks;
    }

    /**
     * Processes multiple text chunks with parallel audio generation for fluent playback.
     * Generates audio for all chunks in parallel while playing them sequentially.
     */
    private async processAllChunks(chunks: TextChunk[]): Promise<void> {
        console.log(`TTS Orchestration: Starting parallel processing of ${chunks.length} chunks`);
        this.isProcessingMultipleChunks = chunks.length > 1;

        // Start parallel audio generation for all chunks
        const audioGenerationPromises = this.startParallelAudioGeneration(chunks);

        // Play chunks sequentially as their audio becomes available
        await this.playChunksSequentially(chunks, audioGenerationPromises);
        
        console.log('TTS Orchestration: Finished processing all chunks');
    }

    /**
     * Start generating audio for all chunks in parallel.
     */
    private startParallelAudioGeneration(chunks: TextChunk[]): Promise<Blob | null>[] {
        return chunks.map(async (chunk, index) => {
            try {
                console.log(`Background: Starting audio generation for chunk ${index + 1}/${chunks.length}`);
                const audioBlob = await this.generateAudioOnly(chunk);
                console.log(`Background: Audio generation completed for chunk ${index + 1}/${chunks.length}`);
                return audioBlob;
            } catch (error) {
                console.error(`Background: Audio generation failed for chunk ${index + 1}:`, error);
                return null;
            }
        });
    }

    /**
     * Play chunks sequentially as their audio becomes available.
     */
    private async playChunksSequentially(
        chunks: TextChunk[], 
        audioPromises: Promise<Blob | null>[]
    ): Promise<void> {
        for (let i = 0; i < chunks.length; i++) {
            if (!this.isExecuting) {
                console.log(`TTS Orchestration: Execution stopped, breaking at chunk ${i + 1}`);
                break;
            }

            await this.playChunkWhenReady(chunks[i], audioPromises[i], i + 1, chunks.length);

            // Transition from "generating" to "playing" after first chunk starts
            if (i === 0) {
                this.stateManager.setGenerating(false);
                console.log('TTS Orchestration: Transitioned from generating to playing');
            }
        }
    }

    /**
     * Play a single chunk when its audio is ready.
     */
    private async playChunkWhenReady(
        chunk: TextChunk, 
        audioPromise: Promise<Blob | null>,
        chunkNumber: number,
        totalChunks: number
    ): Promise<void> {
        try {
            console.log(`TTS Orchestration: Waiting for audio to be ready for chunk ${chunkNumber}/${totalChunks}`);
            
            const audioBlob = await audioPromise;
            
            if (audioBlob) {
                console.log(`TTS Orchestration: Playing pre-generated audio for chunk ${chunkNumber}/${totalChunks}`);
                await this.playPreGeneratedAudio(audioBlob, chunk);
            } else {
                console.warn(`TTS Orchestration: Skipping chunk ${chunkNumber} due to generation failure`);
            }
            
            console.log(`TTS Orchestration: Completed chunk ${chunkNumber}/${totalChunks}`);
        } catch (error) {
            console.error(`TTS Orchestration: Failed to play chunk ${chunkNumber}:`, error);
            // Continue with next chunk instead of stopping entirely
        }
    }

    /**
     * Generate audio for a chunk without playing it (for parallel processing).
     */
    private async generateAudioOnly(chunk: TextChunk): Promise<Blob> {
        const processedText = this.processTextChunk(chunk);
        const requestConfig = this.createAudioRequestConfig(processedText);
        
        const response = await fetch('/api/tts/azure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestConfig),
        });

        if (!response.ok) {
            throw new Error(`TTS API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Create the request configuration for audio generation.
     */
    private createAudioRequestConfig(processedText: string) {
        return {
            text: processedText,
            voiceId: 'en-US-AriaNeural', // Default voice for generation
        };
    }

    /**
     * Process text chunk using the same logic as the adapter's text processor.
     */
    private processTextChunk(chunk: TextChunk): string {
        const text = chunk.text?.trim() || '';
        if (!text) return '';

        const cleanText = this.escapeSSML(text);
        return this.applyElementFormatting(cleanText, chunk.element);
    }

    /**
     * Apply SSML formatting based on element type.
     */
    private applyElementFormatting(cleanText: string, element?: string): string {
        switch (element?.toLowerCase()) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return this.formatHeading(cleanText);
            case 'p':
                return this.formatParagraph(cleanText);
            case 'code':
            case 'pre':
            case 'kbd':
            case 'samp':
                return this.formatCode(cleanText);
            case 'i':
            case 'em':
                return this.formatItalic(cleanText);
            case 'b':
            case 'strong':
                return this.formatBold(cleanText);
            default:
                return cleanText;
        }
    }

    /**
     * SSML formatting methods for different element types.
     */
    private formatHeading(text: string): string {
        return `<break time="0.5s"/><emphasis level="strong"><prosody rate="slow">${text}</prosody></emphasis><break time="1s"/>`;
    }

    private formatParagraph(text: string): string {
        return `${text}<break time="0.3s"/>`;
    }

    private formatCode(text: string): string {
        return `<emphasis level="moderate">${text}</emphasis>`;
    }

    private formatItalic(text: string): string {
        return `<emphasis level="moderate">${text}</emphasis>`;
    }

    private formatBold(text: string): string {
        return `<emphasis level="strong">${text}</emphasis>`;
    }

    /**
     * Escape SSML special characters.
     */
    private escapeSSML(text: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }
        return text.replace(/[<>&"']/g, (match) => {
            const escapeMap: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&apos;'
            };
            return escapeMap[match] || match;
        });
    }

    /**
     * Play pre-generated audio blob.
     */
    private async playPreGeneratedAudio(audioBlob: Blob, chunk: TextChunk): Promise<void> {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise<void>((resolve, reject) => {
            let onEnded: (() => void) | null = null;
            let onError: ((error: Event) => void) | null = null;
            
            const cleanup = () => {
                URL.revokeObjectURL(audioUrl);
                if (onEnded) audio.removeEventListener('ended', onEnded);
                if (onError) audio.removeEventListener('error', onError);
            };
            
            onEnded = () => {
                console.log(`Playback completed for chunk: "${this.getChunkPreview(chunk)}"`);
                cleanup();
                resolve();
            };

            onError = (error: Event) => {
                console.error(`Playback error for chunk: "${this.getChunkPreview(chunk)}"`, error);
                cleanup();
                reject(new Error(`Audio playback failed`));
            };

            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onError);

            console.log(`Starting playback for chunk: "${this.getChunkPreview(chunk)}"`);
            audio.play().catch(playError => {
                console.error(`Failed to start playback:`, playError);
                cleanup();
                reject(playError);
            });
        });
    }

    /**
     * Get a preview of chunk text for logging.
     */
    private getChunkPreview(chunk: TextChunk): string {
        return chunk.text?.substring(0, 30) + '...' || 'empty chunk';
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
