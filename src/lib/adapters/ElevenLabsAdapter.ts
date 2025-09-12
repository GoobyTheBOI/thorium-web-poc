import type {
    IAdapterConfig,
    ITextProcessor,
    IPlaybackAdapter,
    IVoiceProvider,
    VoiceInfo
} from '@/preferences/types';
import { TextChunk } from '@/preferences/types';
import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { createNetworkAwareError, createError, handleDevelopmentError } from '@/lib/utils/errorUtils';
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
    private readonly config: IAdapterConfig = {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        modelId: 'eleven_multilingual_v2'
    };
    private readonly textProcessor: ITextProcessor;
    private readonly voiceService: VoiceManagementService;
    private readonly eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();

    private currentAudio: HTMLAudioElement | null = null;
    public isPlaying: boolean = false;
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
    processTextChunk(chunk: TextChunk): Promise<ArrayBuffer> {
        throw new Error('Method not implemented.');
    }
    startPlayback(data: ArrayBuffer): void {
        throw new Error('Method not implemented.');
    }
    stopPlayback(): void {
        throw new Error('Method not implemented.');
    }

    // Private voice methods - only available through voices property
    private async getVoices(): Promise<VoiceInfo[]> {
        return await this.voiceService.loadElevenLabsVoices();
    }

    private async setVoice(voiceId: string): Promise<void> {
        this.voiceService.selectVoice(voiceId);
        this.config.voiceId = voiceId;
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
        }
    }

    resume(): void {
        if (this.currentAudio && this.isPaused) {
            this.currentAudio.play().catch(error => {
                const ttsError = createNetworkAwareError(error, 'ElevenLabs');
                this.emitEvent('error', { error: ttsError });
            });
            this.updatePlaybackState(true, false);
            this.emitEvent('resume', { audio: this.currentAudio });
        }
    }

    stop(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.updatePlaybackState(false, false);
            this.emitEvent('stop', { audio: this.currentAudio });
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
            throw createError('INVALID_TEXT', 'Text validation failed');
        }
    }

    private async executePlayRequest(config: PlayRequestConfig): Promise<PlayResult> {

        try {
            // Clean up any existing audio first
            this.cleanup();

            // Make API request
            const response = await this.makeApiRequest(config);

            // Process response
            const { audioBlob, requestId } = await this.processApiResponse(response);

            // Setup and start audio playback
            const audio = await this.setupAudioPlayback(audioBlob);

            return { requestId, audio };

        } catch (error) {
            const ttsError = createNetworkAwareError(error, 'ElevenLabs');
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
                    // Silently handle listener errors to prevent disrupting other listeners
                    handleDevelopmentError(error, `ElevenLabs Adapter Event Listener Error (${event})`);
                }
            });
        }
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
    }
}
