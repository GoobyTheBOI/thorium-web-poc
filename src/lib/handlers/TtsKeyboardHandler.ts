import { KeyboardHandler, KeyboardShortcut } from './KeyboardHandler';
import { ITtsOrchestrationService } from '../services/TtsOrchestrationService';

export class TtsKeyboardHandler {
    private keyboardHandler: KeyboardHandler;
    private orchestrationService: ITtsOrchestrationService;
    private lastStartTime: number = 0;
    private readonly START_THROTTLE_MS = 1000; // Prevent rapid start commands

    constructor(orchestrationService: ITtsOrchestrationService) {
        this.keyboardHandler = new KeyboardHandler();
        this.orchestrationService = orchestrationService;
        this.setupTtsShortcuts();
    }

    getShortcuts(): KeyboardShortcut[] {
        return this.keyboardHandler.getShortcuts();
    }

    cleanup(): void {
        this.keyboardHandler.cleanup();
    }

    setEnabled(enabled: boolean): void {
        this.keyboardHandler.setEnabled(enabled);
    }

    private setupTtsShortcuts(): void {
        const shortcuts: KeyboardShortcut[] = [
            {
                key: ' ',
                action: () => {
                    if (this.orchestrationService.isPlaying()) {
                        this.orchestrationService.pauseReading();
                    } else if (this.orchestrationService.isPaused()) {
                        this.orchestrationService.resumeReading();
                    }
                },
                description: 'Play/Pause TTS'
            },
            {
                key: 's',
                shiftKey: true,
                action: () => this.orchestrationService.stopReading(),
                description: 'Stop TTS'
            },
            {
                key: 'p',
                shiftKey: true,
                action: () => {
                    const now = Date.now();
                    if (now - this.lastStartTime < this.START_THROTTLE_MS) {
                        console.log('TTS: Start command throttled to prevent duplicate execution');
                        return;
                    }

                    if (!this.orchestrationService.isPlaying() &&
                        !this.orchestrationService.isPaused()) {
                        this.lastStartTime = now;
                        console.log('TTS: Starting reading via keyboard shortcut');
                        this.orchestrationService.startReading().catch(console.error);
                    } else {
                        console.log('TTS: Already playing or paused, ignoring start command');
                    }
                },
                description: 'Start TTS Reading'
            },
            {
                key: 'escape',
                action: () => {
                    if (this.orchestrationService.isPlaying() ||
                        this.orchestrationService.isPaused()) {
                        this.orchestrationService.stopReading();
                    }
                },
                description: 'Emergency Stop TTS'
            },
            {
                key: 't',
                shiftKey: true,
                action: () => {
                    try {
                        this.orchestrationService.switchAdapter();
                    } catch (error) {
                        console.error('Failed to switch adapter:', error);
                    }
                },
                description: 'Switch TTS Adapter'
            }
        ];

        this.keyboardHandler.register(shortcuts);
        console.log('TTS keyboard shortcuts registered');
    }
}
