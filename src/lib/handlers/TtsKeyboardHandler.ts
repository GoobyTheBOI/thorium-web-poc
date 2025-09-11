import { KeyboardHandler, KeyboardShortcut } from './KeyboardHandler';
import { ITtsOrchestrationService } from '../services/TtsOrchestrationService';
import { INTERACTION_CONSTANTS } from '../constants/uiConstants';

export class TtsKeyboardHandler {
    private keyboardHandler: KeyboardHandler;
    private orchestrationService: ITtsOrchestrationService;
    private lastStartTime: number = 0;
    private readonly START_THROTTLE_MS = INTERACTION_CONSTANTS.THROTTLE.TTS_START_MS;
    private onToggle?: () => void;

    constructor(orchestrationService: ITtsOrchestrationService, onToggle?: () => void) {
        this.keyboardHandler = new KeyboardHandler();
        this.orchestrationService = orchestrationService;
        this.onToggle = onToggle;
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
                key: 's',
                shiftKey: true,
                action: () => this.orchestrationService.stopReading(),
                description: 'Stop TTS'
            },
            {
                key: 'p',
                shiftKey: true,
                action: () => {
                    if (!this.orchestrationService.isPlaying() && !this.orchestrationService.isPaused()) {
                        // Start reading if nothing is playing or paused
                        const now = Date.now();
                        if (now - this.lastStartTime < this.START_THROTTLE_MS) {
                            return;
                        }

                        this.lastStartTime = now;
                        console.log('TTS: Starting reading via keyboard shortcut');
                        this.orchestrationService.startReading().catch(console.error);
                    } else if (this.orchestrationService.isPlaying()) {
                        // Pause if currently playing
                        this.orchestrationService.pauseReading();
                    } else if (this.orchestrationService.isPaused()) {
                        // Resume if paused
                        this.orchestrationService.resumeReading();
                    }
                },
                description: 'Start/Pause/Resume TTS'
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
            },
            {
                key: 'q',
                shiftKey: true,
                action: () => {
                    if (this.onToggle) {
                        this.onToggle();
                    }
                },
                description: 'Toggle TTS On/Off'
            }
        ];

        this.keyboardHandler.register(shortcuts);
    }
}
