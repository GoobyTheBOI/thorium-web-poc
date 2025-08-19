import { TTS_CONSTANTS } from '@/types/tts';
import { IPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { IKeyboardShortcutService, KeyboardShortcutService, ShortcutConfig } from './KeyboardShortcutService';
import { TTSAdapterFactory, AdapterType } from '../AdapterFactory';

export interface ITtsOrchestrationService {
    startReading(): Promise<void>;
    pauseReading(): void;
    resumeReading(): void;
    stopReading(): void;
    isPlaying(): boolean;
    isPaused(): boolean;
    on(event: string, callback: (info: unknown) => void): void;
    enableKeyboardShortcuts(): void;
    disableKeyboardShortcuts(): void;
    getShortcuts(): ShortcutConfig[];
    switchAdapter(adapterType?: AdapterType): void;
    getCurrentAdapterType(): AdapterType | null;
    destroy(): void;
}

export class TtsOrchestrationService implements ITtsOrchestrationService {
    private eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();
    private keyboardService: IKeyboardShortcutService;
    private isExecuting: boolean = false; // Prevent concurrent operations
    private adapterFactory: TTSAdapterFactory;
    private currentAdapterType: AdapterType | null = null;
    private adapterEventHandlers: Map<string, (info: unknown) => void> = new Map();

    constructor(
        private adapter: IPlaybackAdapter,
        private textExtractor: ITextExtractionService,
        initialAdapterType?: AdapterType
    ) {
        this.setupAdapterEvents();
        this.keyboardService = new KeyboardShortcutService();
        this.adapterFactory = new TTSAdapterFactory();
        this.currentAdapterType = initialAdapterType || null;
        this.setupKeyboardShortcuts();
    }

    async startReading(): Promise<void> {
        // Prevent concurrent execution
        if (this.isExecuting) {
            console.log('TTS: Start reading already in progress, ignoring duplicate request');
            return;
        }

        // Don't start if already playing
        if (this.isPlaying()) {
            console.log('TTS: Already playing, ignoring start request');
            return;
        }

        this.isExecuting = true;

        try {
            const chunks = await this.textExtractor.extractTextChunks();
            const chunksToSend = chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);

            console.log(`Starting TTS with ${chunksToSend.length} chunks`);

            // Process chunks sequentially for context continuity
            for (let i = 0; i < chunksToSend.length; i++) {
                const textChunk = chunksToSend[i];

                console.log(`Processing chunk ${i + 1}/${chunksToSend.length}:`, {
                    element: textChunk.element,
                    text: textChunk.text
                });

                await this.adapter.play(textChunk);
            }

            this.emitEvent('reading-started', { chunks: chunksToSend });
        } catch (error) {
            console.error('TTS Orchestration: Failed to start reading', error);
            this.emitEvent('error', { error });
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    pauseReading(): void {
        if (!this.isPlaying()) {
            console.log('TTS: Not playing, ignoring pause request');
            return;
        }

        if (this.isPaused()) {
            console.log('TTS: Already paused, ignoring pause request');
            return;
        }

        this.adapter.pause();
        console.log('TTS: Paused via orchestration service');
    }

    resumeReading(): void {
        if (!this.isPaused()) {
            console.log('TTS: Not paused, ignoring resume request');
            return;
        }

        this.adapter.resume();
        console.log('TTS: Resumed via orchestration service');
    }

    stopReading(): void {
        if (!this.isPlaying() && !this.isPaused()) {
            console.log('TTS: Not playing or paused, ignoring stop request');
            return;
        }

        this.adapter.stop();
        this.isExecuting = false; // Reset execution flag
        this.emitEvent('reading-stopped', {});
        console.log('TTS: Stopped via orchestration service');
    }

    isPlaying(): boolean {
        return this.adapter.getIsPlaying?.() || false;
    }

    isPaused(): boolean {
        return this.adapter.getIsPaused?.() || false;
    }

    on(event: string, callback: (info: unknown) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    enableKeyboardShortcuts(): void {
        this.keyboardService.setEnabled(true);
        this.emitEvent('shortcuts-enabled', {});
    }

    disableKeyboardShortcuts(): void {
        this.keyboardService.setEnabled(false);
        this.emitEvent('shortcuts-disabled', {});
    }

    getShortcuts(): ShortcutConfig[] {
        return this.keyboardService.getRegisteredShortcuts();
    }

    switchAdapter(adapterType?: AdapterType): void {
        const implementedAdapters = TTSAdapterFactory.getImplementedAdapters();

        if (adapterType) {
            // Switch to specific adapter
            const targetAdapter = implementedAdapters.find(a => a.key === adapterType);
            if (!targetAdapter) {
                console.warn(`Adapter ${adapterType} not found or not implemented`);
                return;
            }
            this.performAdapterSwitch(adapterType);
        } else {
            // Cycle through implemented adapters
            const currentIndex = implementedAdapters.findIndex(a => a.key === this.currentAdapterType);
            const nextIndex = (currentIndex + 1) % implementedAdapters.length;
            const nextAdapterType = implementedAdapters[nextIndex].key as AdapterType;
            this.performAdapterSwitch(nextAdapterType);
        }
    }

    getCurrentAdapterType(): AdapterType | null {
        return this.currentAdapterType;
    }

    private performAdapterSwitch(newAdapterType: AdapterType): void {
        if (newAdapterType === this.currentAdapterType) {
            console.log(`Already using ${newAdapterType} adapter`);
            return;
        }

        // Stop current playback
        this.stopReading();

        // Create new adapter
        try {
            const newAdapter = this.adapterFactory.createAdapter(newAdapterType);

            // Clean up old adapter event listeners if we have one
            if (this.adapter) {
                this.cleanupAdapterEvents();
            }

            // Switch to new adapter
            this.adapter = newAdapter;
            this.currentAdapterType = newAdapterType;

            // Setup events for new adapter
            this.setupAdapterEvents();

            console.log(`Switched to ${newAdapterType} adapter`);
            this.emitEvent('adapter-switched', {
                newAdapter: newAdapterType,
                previousAdapter: this.currentAdapterType
            });

        } catch (error) {
            console.error(`Failed to switch to ${newAdapterType} adapter:`, error);
            this.emitEvent('error', {
                error: `Failed to switch adapter: ${error}`,
                adapterType: newAdapterType
            });
        }
    }

    destroy(): void {
        console.log('TTS Orchestration Service: Destroying and cleaning up');
        this.keyboardService.unregisterShortcuts();
        this.stopReading();
        this.eventListeners.clear();
    }

    private setupKeyboardShortcuts(): void {
        const shortcuts: ShortcutConfig[] = [
            {
                key: ' ', // Spacebar
                action: () => {
                    console.log('TTS Shortcut: Space pressed');
                    if (this.isPlaying()) {
                        this.pauseReading();
                    } else if (this.isPaused()) {
                        this.resumeReading();
                    } else {
                        console.log('TTS: Space pressed but no audio to play/pause');
                    }
                },
                description: 'Play/Pause TTS',
                category: 'tts'
            },
            {
                key: 's',
                shiftKey: true,
                action: () => {
                    console.log('TTS Shortcut: Shift+S pressed');
                    this.stopReading();
                },
                description: 'Stop TTS',
                category: 'tts'
            },
            {
                key: 'p',
                shiftKey: true,
                action: () => {
                    console.log('TTS Shortcut: Shift+P pressed');
                    if (!this.isPlaying() && !this.isPaused() && !this.isExecuting) {
                        this.startReading().catch(error => {
                            console.error('Failed to start reading via shortcut:', error);
                        });
                    } else {
                        console.log('TTS: Shift+P pressed but already playing/paused or executing');
                    }
                },
                description: 'Start TTS Reading',
                category: 'tts'
            },
            {
                key: 'r',
                shiftKey: true,
                action: () => {
                    console.log('TTS Shortcut: Shift+R pressed');
                    if (this.isPaused()) {
                        this.resumeReading();
                    } else {
                        console.log('TTS: Shift+R pressed but not paused');
                    }
                },
                description: 'Resume TTS',
                category: 'tts'
            },
            {
                key: 'escape',
                action: () => {
                    console.log('TTS Shortcut: Escape pressed');
                    if (this.isPlaying() || this.isPaused()) {
                        this.stopReading();
                    } else {
                        console.log('TTS: Escape pressed but no audio to stop');
                    }
                },
                description: 'Emergency Stop TTS',
                category: 'tts'
            },
            {
                key: 't',
                shiftKey: true,
                action: () => {
                    console.log('TTS Shortcut: Shift+T pressed');
                    try {
                        this.switchAdapter();
                        const currentAdapter = this.getCurrentAdapterType();
                        console.log(`TTS: Switched to ${currentAdapter} adapter`);
                    } catch (error) {
                        console.error('Failed to switch adapter via shortcut:', error);
                    }
                },
                description: 'Switch TTS Adapter',
                category: 'tts'
            }
        ];

        this.keyboardService.registerShortcuts(shortcuts);
        console.log('TTS keyboard shortcuts registered with single-execution protection');
    }

    private cleanupAdapterEvents(): void {
        if (!this.adapter) return;

        console.log('TTS: Cleaning up adapter event listeners');

        // Remove specific event listeners using stored references
        this.adapterEventHandlers.forEach((handler, event) => {
            try {
                this.adapter.off(event as any, handler);
                console.log(`TTS: Removed ${event} event listener`);
            } catch (error) {
                console.warn(`TTS: Could not remove ${event} event listener:`, error);
            }
        });

        // Clear the stored handlers
        this.adapterEventHandlers.clear();

        // Also call destroy as a fallback
        try {
            this.adapter.destroy();
            console.log('TTS: Successfully cleaned up adapter event listeners');
        } catch (error) {
            console.error('TTS: Error during adapter cleanup:', error);
        }
    }

    private setupAdapterEvents(): void {
        // Create and store bound event handlers
        const playHandler = (info: unknown) => {
            console.log('TTS Orchestration: Play started', info);
            this.emitEvent('play', info);
        };

        const pauseHandler = (info: unknown) => {
            console.log('TTS Orchestration: Paused', info);
            this.emitEvent('pause', info);
        };

        const resumeHandler = (info: unknown) => {
            console.log('TTS Orchestration: Resumed', info);
            this.emitEvent('resume', info);
        };

        const stopHandler = (info: unknown) => {
            console.log('TTS Orchestration: Stopped', info);
            this.isExecuting = false; // Reset execution flag
            this.emitEvent('stop', info);
        };

        const endHandler = (info: unknown) => {
            console.log('TTS Orchestration: Ended', info);
            this.isExecuting = false; // Reset execution flag
            this.emitEvent('end', info);
        };

        const errorHandler = (info: unknown) => {
            console.error('TTS Orchestration: Error', info);
            this.isExecuting = false; // Reset execution flag on error
            this.emitEvent('error', info);
        };

        // Store the handlers for later removal
        this.adapterEventHandlers.set('play', playHandler);
        this.adapterEventHandlers.set('pause', pauseHandler);
        this.adapterEventHandlers.set('resume', resumeHandler);
        this.adapterEventHandlers.set('stop', stopHandler);
        this.adapterEventHandlers.set('end', endHandler);
        this.adapterEventHandlers.set('error', errorHandler);

        // Register the event listeners
        this.adapter.on('play', playHandler);
        this.adapter.on('pause', pauseHandler);
        this.adapter.on('resume', resumeHandler);
        this.adapter.on('stop', stopHandler);
        this.adapter.on('end', endHandler);
        this.adapter.on('error', errorHandler);

        console.log('TTS: Setup adapter event listeners');
    }

    private emitEvent(event: string, info: unknown): void {
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
