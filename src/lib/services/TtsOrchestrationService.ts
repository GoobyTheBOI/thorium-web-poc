import { TTS_CONSTANTS } from '@/types/tts';
import { IPlaybackAdapter } from '@/preferences/types';
import { ITextExtractionService } from './TextExtractionService';
import { IKeyboardShortcutService, KeyboardShortcutService, ShortcutConfig } from './KeyboardShortcutService';
import { TTSAdapterFactory, AdapterType } from '../AdapterFactory';
import { 
    ITtsEventEmitter, 
    TtsEventEmitter, 
    ITtsEventHandler, 
    TtsEvent,
    TtsPlayEvent,
    TtsPauseEvent,
    TtsResumeEvent,
    TtsStopEvent,
    TtsErrorEvent,
    TtsAdapterSwitchedEvent
} from './TtsEventSystem';
import { 
    ITtsCommand,
    TtsCommandInvoker,
    StartReadingCommand,
    PauseReadingCommand,
    ResumeReadingCommand,
    StopReadingCommand
} from './TtsCommands';
import { 
    ITtsStateManager, 
    TtsStateManager, 
    ITtsState 
} from './TtsStateManager';

/**
 * Main interface for TTS orchestration with clearly defined responsibilities
 * Follows Interface Segregation Principle
 */
export interface ITtsOrchestrationService {
    // Playback control
    startReading(): Promise<void>;
    pauseReading(): Promise<void>;
    resumeReading(): Promise<void>;
    stopReading(): Promise<void>;
    
    // State queries
    getCurrentState(): ITtsState;
    isPlaying(): boolean;
    isPaused(): boolean;
    
    // Event system
    onEvent<T extends TtsEvent>(eventType: T['type'], handler: ITtsEventHandler<T>): void;
    offEvent<T extends TtsEvent>(eventType: T['type'], handler: ITtsEventHandler<T>): void;
    
    // Keyboard shortcuts
    enableKeyboardShortcuts(): void;
    disableKeyboardShortcuts(): void;
    getShortcuts(): ShortcutConfig[];
    
    // Adapter management
    switchAdapter(adapterType?: AdapterType): Promise<void>;
    getCurrentAdapterType(): AdapterType | null;
    
    // Lifecycle
    destroy(): void;
}

/**
 * Refactored TTS Orchestration Service following SOLID principles
 * - Single Responsibility: Coordinates between different TTS subsystems
 * - Open/Closed: Extensible through dependency injection
 * - Liskov Substitution: Uses interfaces for all dependencies
 * - Interface Segregation: Clear, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export class TtsOrchestrationService implements ITtsOrchestrationService {
    private readonly eventEmitter: ITtsEventEmitter;
    private readonly commandInvoker: TtsCommandInvoker;
    private readonly stateManager: ITtsStateManager;
    private readonly keyboardService: IKeyboardShortcutService;
    private readonly adapterFactory: TTSAdapterFactory;
    
    private currentAdapterType: AdapterType | null = null;
    private adapterEventCleanup: (() => void) | null = null;

    constructor(
        private adapter: IPlaybackAdapter,
        private readonly textExtractor: ITextExtractionService,
        initialAdapterType?: AdapterType
    ) {
        // Initialize subsystems
        this.eventEmitter = new TtsEventEmitter();
        this.commandInvoker = new TtsCommandInvoker();
        this.stateManager = new TtsStateManager();
        this.keyboardService = new KeyboardShortcutService();
        this.adapterFactory = new TTSAdapterFactory();
        
        // Set initial adapter type
        this.currentAdapterType = initialAdapterType || null;
        
        // Setup integrations
        this.setupAdapterEvents();
        this.setupStateManagement();
        this.setupKeyboardShortcuts();
        
        console.log(`TTS Orchestration Service initialized with ${initialAdapterType || 'default'} adapter`);
    }

    // Playback control methods using Command pattern
    async startReading(): Promise<void> {
        if (!this.stateManager.canStart()) {
            console.log('TTS: Cannot start reading in current state:', this.stateManager.getCurrentState().name);
            return;
        }

        try {
            const chunks = await this.textExtractor.extractTextChunks();
            const limitedChunks = chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING);
            
            console.log(`Starting TTS with ${limitedChunks.length} chunks`);
            
            const command = new StartReadingCommand(this.adapter, this.eventEmitter, limitedChunks);
            await this.commandInvoker.execute(command);
            
            this.stateManager.transitionToStarted();
        } catch (error) {
            this.stateManager.transitionToError();
            const errorEvent: TtsErrorEvent = {
                type: 'error',
                timestamp: new Date(),
                source: 'TtsOrchestrationService.startReading',
                error: error instanceof Error ? error : new Error(String(error))
            };
            this.eventEmitter.emit(errorEvent);
            throw error;
        }
    }

    async pauseReading(): Promise<void> {
        if (!this.stateManager.canPause()) {
            console.log('TTS: Cannot pause in current state:', this.stateManager.getCurrentState().name);
            return;
        }

        try {
            const command = new PauseReadingCommand(this.adapter, this.eventEmitter);
            await this.commandInvoker.execute(command);
            this.stateManager.transitionToPaused();
        } catch (error) {
            this.stateManager.transitionToError();
            throw error;
        }
    }

    async resumeReading(): Promise<void> {
        if (!this.stateManager.canResume()) {
            console.log('TTS: Cannot resume in current state:', this.stateManager.getCurrentState().name);
            return;
        }

        try {
            const command = new ResumeReadingCommand(this.adapter, this.eventEmitter);
            await this.commandInvoker.execute(command);
            this.stateManager.transitionToResumed();
        } catch (error) {
            this.stateManager.transitionToError();
            throw error;
        }
    }

    async stopReading(): Promise<void> {
        if (!this.stateManager.canStop()) {
            console.log('TTS: Cannot stop in current state:', this.stateManager.getCurrentState().name);
            return;
        }

        try {
            const command = new StopReadingCommand(this.adapter, this.eventEmitter);
            await this.commandInvoker.execute(command);
            this.stateManager.transitionToStopped();
        } catch (error) {
            console.error('Error stopping TTS:', error);
            // Force stop even on error
            this.stateManager.transitionToStopped();
        }
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
            this.requestIds = [];
            this.isExecuting = false; // Reset execution flag
            this.emitEvent('stop', info);
        };

        const endHandler = (info: unknown) => {
            console.log('TTS Orchestration: Ended', info);
            this.requestIds = [];
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
