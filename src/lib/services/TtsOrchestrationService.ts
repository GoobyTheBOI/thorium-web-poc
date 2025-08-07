import { TTS_CONSTANTS } from '@/types/tts';
import { IContextualPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { IKeyboardShortcutService, KeyboardShortcutService, ShortcutConfig } from './KeyboardShortcutService';

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
    destroy(): void;
}

export class TtsOrchestrationService implements ITtsOrchestrationService {
    private requestIds: string[] = [];
    private eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();
    private keyboardService: IKeyboardShortcutService;
    private isExecuting: boolean = false; // Prevent concurrent operations

    constructor(
        private adapter: IContextualPlaybackAdapter,
        private textExtractor: ITextExtractionService
    ) {
        this.setupAdapterEvents();
        this.keyboardService = new KeyboardShortcutService();
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
            this.requestIds = [];

            // Process chunks sequentially for context continuity
            for (let i = 0; i < chunksToSend.length; i++) {
                const textChunk = chunksToSend[i];

                console.log(`Processing chunk ${i + 1}/${chunksToSend.length}:`, {
                    element: textChunk.element,
                    text: textChunk.text
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
        this.requestIds = [];
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
                ctrlKey: true,
                action: () => {
                    console.log('TTS Shortcut: Ctrl+S pressed');
                    this.stopReading();
                },
                description: 'Stop TTS',
                category: 'tts'
            },
            {
                key: 'p',
                ctrlKey: true,
                action: () => {
                    console.log('TTS Shortcut: Ctrl+P pressed');
                    if (!this.isPlaying() && !this.isPaused() && !this.isExecuting) {
                        this.startReading().catch(error => {
                            console.error('Failed to start reading via shortcut:', error);
                        });
                    } else {
                        console.log('TTS: Ctrl+P pressed but already playing/paused or executing');
                    }
                },
                description: 'Start TTS Reading',
                category: 'tts'
            },
            {
                key: 'r',
                ctrlKey: true,
                action: () => {
                    console.log('TTS Shortcut: Ctrl+R pressed');
                    if (this.isPaused()) {
                        this.resumeReading();
                    } else {
                        console.log('TTS: Ctrl+R pressed but not paused');
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
            }
        ];

        this.keyboardService.registerShortcuts(shortcuts);
        console.log('TTS keyboard shortcuts registered with single-execution protection');
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
            this.isExecuting = false; // Reset execution flag
            this.emitEvent('stop', info);
        });

        this.adapter.on('end', (info) => {
            console.log('TTS Orchestration: Ended', info);
            this.requestIds = [];
            this.isExecuting = false; // Reset execution flag
            this.emitEvent('end', info);
        });

        this.adapter.on('error', (info) => {
            console.error('TTS Orchestration: Error', info);
            this.isExecuting = false; // Reset execution flag on error
            this.emitEvent('error', info);
        });
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
