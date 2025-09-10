import type {
    IAdapterConfig,
    ITextProcessor,
    ITTSError,
    IPlaybackAdapter,
    IVoiceProvider,
    VoiceInfo
} from '@/preferences/types';
import { TextChunk } from '@/types/tts';
import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { playUniversal, TextToAudioAdapter } from '@/lib/utils/audioPlaybackUtils';

interface PlayRequestConfig {
    text: string | TextChunk[];
    voiceId: string;
    modelId: string | undefined;
}

interface PlayResult {
    requestId: string | null;
    audio: HTMLAudioElement;
}

export class ElevenLabsAdapter implements IPlaybackAdapter, TextToAudioAdapter {
    private config: IAdapterConfig = {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        modelId: 'eleven_multilingual_v2'
    };
    private readonly textProcessor: ITextProcessor;
    private readonly voiceService: VoiceManagementService;
    private readonly eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();

    private currentAudio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private isPaused: boolean = false;

    // Implement voices property for legacy support
    public readonly voices: IVoiceProvider;

    constructor(
        textProcessor: ITextProcessor,
        voiceService: VoiceManagementService
    ) {
        this.textProcessor = textProcessor;
        this.voiceService = voiceService;

        // Create voices property that delegates to this adapter's methods
        this.voices = {
            getVoices: () => this.getVoices(),
            setVoice: (voiceId: string) => this.setVoice(voiceId),
            getVoicesByGender: (gender: 'male' | 'female') => this.getVoicesByGender(gender),
            getCurrentVoiceGender: () => this.getCurrentVoiceGender()
        };
    }

    // Private voice methods - only available through voices property
    private async getVoices(): Promise<VoiceInfo[]> {
        return await this.voiceService.loadElevenLabsVoices();
    }

    private async setVoice(voiceId: string): Promise<void> {
        this.voiceService.selectVoice(voiceId);
        this.config.voiceId = voiceId;
        console.log(`ElevenLabsAdapter: Voice changed to ${voiceId}`);
    }

    private async getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]> {
        const allVoices = await this.voiceService.loadElevenLabsVoices();
        return allVoices.filter(voice => voice.gender === gender);
    }

    private async getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null> {
        const selectedVoice = this.voiceService.getSelectedVoice();
        if (!selectedVoice) {
            return null;
        }

        const allVoices = await this.voiceService.loadElevenLabsVoices();
        const voice = allVoices.find(v => v.id === selectedVoice);
        return voice?.gender || null;
    }

    async play<T = Buffer>(input: TextChunk | Blob): Promise<T> {
        return await playUniversal(this, input, { success: true } as T);
    }

    async playTextChunk<T = Buffer>(textChunk: TextChunk): Promise<T> {
        this.validateAndFormatText(textChunk.text);

        const processedText = this.textProcessor.formatText(textChunk.text, textChunk.element || 'normal');

        const requestConfig: PlayRequestConfig = {
            text: processedText,
            voiceId: this.config.voiceId,
            modelId: this.config.modelId,
        };

        const result = await this.executePlayRequest(requestConfig);
        return { requestId: result.requestId } as T;
    }

    pause(): void {
        if (this.currentAudio && this.isPlaying) {
            this.currentAudio.pause();
            this.updatePlaybackState(false, true);
            this.emitEvent('pause', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio paused');
        } else {
            console.warn('ElevenLabsAdapter: No audio to pause or already paused');
        }
    }

    resume(): void {
        if (this.currentAudio && this.isPaused) {
            this.currentAudio.play().catch(error => {
                console.error('ElevenLabsAdapter: Resume failed:', error);
                this.emitEvent('error', { error });
            });
            this.updatePlaybackState(true, false);
            this.emitEvent('resume', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio resumed');
        } else {
            console.warn('ElevenLabsAdapter: No audio to resume or not paused');
        }
    }

    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.updatePlaybackState(false, false);
            this.emitEvent('stop', { audio: this.currentAudio });
            console.log('ElevenLabsAdapter: Audio stopped');
        } else {
            console.warn('ElevenLabsAdapter: No audio to stop');
        }
    }

    on(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: 'wordBoundary' | 'end' | 'play' | 'pause' | 'resume' | 'stop' | 'error', callback: (info: unknown) => void): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // State getter methods
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    getIsPaused(): boolean {
        return this.isPaused;
    }

    getCurrentAudio(): HTMLAudioElement | null {
        return this.currentAudio;
    }

    private validateAndFormatText(text: string): void {
        if (!this.textProcessor.validateText(text)) {
            throw this.createError('INVALID_TEXT', 'Text validation failed');
        }
    }

    private async executePlayRequest(config: PlayRequestConfig): Promise<PlayResult> {
        console.log('ElevenLabsAdapter: Starting play request with config:', {
            text: typeof config.text === 'string' ? config.text.substring(0, 50) + '...' : `${config.text.length} chunks`,
            voiceId: config.voiceId,
            modelId: config.modelId
        });

        try {
            // Clean up any existing audio first
            this.cleanup();

            // Make API request
            console.log('ElevenLabsAdapter: Making API request...');
            const response = await this.makeApiRequest(config);

            // Process response
            console.log('ElevenLabsAdapter: Processing API response...');
            const { audioBlob, requestId } = await this.processApiResponse(response);

            // Setup and start audio playback
            const audio = await this.setupAudioPlayback(audioBlob);

            return { requestId, audio };

        } catch (error) {
            const ttsError = this.createError('PLAYBACK_FAILED', 'Failed to generate audio with ElevenLabs', error);
            this.emitEvent('end', { success: false, error: ttsError });
            throw ttsError;
        }
    }

    private async makeApiRequest(config: PlayRequestConfig): Promise<Response> {
        const response = await fetch('/api/tts/elevenlabs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response;
    }

    private async processApiResponse(response: Response): Promise<{
        audioBlob: Blob;
        requestId: string | null;
    }> {
        const audioBlob = await response.blob();
        const requestId = response.headers.get("x-request-id");

        return { audioBlob, requestId };
    }

    public async setupAudioPlayback(audioBlob: Blob): Promise<HTMLAudioElement> {
        const audioUrl = URL.createObjectURL(audioBlob);
        this.currentAudio = new Audio(audioUrl);

        // Set up audio event listeners
        this.setupAudioEvents();

        // Start playback
        await this.currentAudio.play();
        this.updatePlaybackState(true, false);

        this.emitEvent('play', { audio: this.currentAudio });

        return this.currentAudio;
    }

    private updatePlaybackState(isPlaying: boolean, isPaused: boolean): void {
        this.isPlaying = isPlaying;
        this.isPaused = isPaused;
    }

    public emitEvent(event: string, info: unknown): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(info);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    public createError(code: string, message: string, details?: unknown): ITTSError {
        return {
            code,
            message,
            details: process.env.NODE_ENV === 'development' ? details : undefined
        };
    }

    private setupAudioEvents(): void {
        if (!this.currentAudio) return;

        this.currentAudio.addEventListener('ended', () => {
            this.updatePlaybackState(false, false);
            this.emitEvent('end', { success: true, audio: this.currentAudio });
        });

        this.currentAudio.addEventListener('error', (error) => {
            this.updatePlaybackState(false, false);
            this.emitEvent('error', { error, audio: this.currentAudio });
        });

        this.currentAudio.addEventListener('loadstart', () => {
            this.emitEvent('loadstart', { audio: this.currentAudio });
        });

        this.currentAudio.addEventListener('pause', () => {
            // Only emit pause if we're not stopping (currentTime === 0)
            if (this.currentAudio && this.currentAudio.currentTime > 0) {
                this.emitEvent('pause', { audio: this.currentAudio });
            }
        });

        this.currentAudio.addEventListener('play', () => {
            this.emitEvent('play', { audio: this.currentAudio });
        });
    }

    public cleanup(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = '';
            this.currentAudio.load();

            // Revoke object URL to prevent memory leaks
            if (this.currentAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(this.currentAudio.src);
            }

            this.currentAudio = null;
        }
        this.updatePlaybackState(false, false);
    }

    public destroy(): void {
        this.cleanup();
        this.eventListeners.clear();
        console.log('ElevenLabsAdapter: Destroyed and cleaned up');
    }
}
