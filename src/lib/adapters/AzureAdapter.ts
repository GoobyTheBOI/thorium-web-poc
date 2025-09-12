import {
    IAdapterConfig,
    IPlaybackAdapter,
    ITextProcessor,
    IVoiceProvider,
    VoiceInfo,
    TextChunk,
} from "@/preferences/types";
import { VoiceManagementService } from "@/lib/services/VoiceManagementService";
import { createNetworkAwareError, createError, handleDevelopmentError } from "@/lib/utils/errorUtils";
import { playUniversal, TextToAudioAdapter } from "@/lib/utils/audioPlaybackUtils";

interface PlayRequestConfig {
    text: string | TextChunk[];
    voiceId: string;
    modelId: string | undefined;
}

interface PlayResult {
    requestId: string | null;
    audio: HTMLAudioElement;
}

export class AzureAdapter implements IPlaybackAdapter, TextToAudioAdapter {
    private readonly config: IAdapterConfig = {
        apiKey: process.env.AZURE_API_KEY || '',
        voiceId: 'en-US-Adam:DragonHDLatestNeural',
        modelId: 'neural'
    };
    private readonly textProcessor: ITextProcessor;
    private readonly eventListeners: Map<string, ((info: unknown) => void)[]> = new Map();
    private readonly voiceService: VoiceManagementService;

    // Audio state management
    private currentAudio: HTMLAudioElement | null = null;
    public isPlaying: boolean = false;
    private isPaused: boolean = false;

    public readonly voices: IVoiceProvider;

    constructor(
        textProcessor: ITextProcessor,
        voiceService: VoiceManagementService
    ) {
        this.textProcessor = textProcessor;
        this.voiceService = voiceService;

        this.voices = {
            getVoices: () => this.getVoices(),
            setVoice: (voiceId: string) => this.setVoice(voiceId),
            getVoicesByGender: (gender: 'male' | 'female') => this.getVoicesByGender(gender),
            getCurrentVoiceGender: () => this.getCurrentVoiceGender()
        };
    }

    private async getVoices(): Promise<VoiceInfo[]> {
        return await this.voiceService.loadAzureVoices();
    }

    private async setVoice(voiceId: string): Promise<void> {
        this.voiceService.selectVoice(voiceId);
        this.config.voiceId = voiceId;
    }

    private async getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]> {
        const allVoices = await this.voiceService.loadAzureVoices();
        return allVoices.filter(voice => voice.gender === gender);
    }

    private async getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null> {
        const selectedVoice = this.voiceService.getSelectedVoice();
        if (!selectedVoice) {
            return null;
        }

        const allVoices = await this.voiceService.loadAzureVoices();
        const voice = allVoices.find(v => v.id === selectedVoice);
        return voice?.gender || null;
    }

    async play<T = Buffer>(input: TextChunk | Blob): Promise<T> {
        return await playUniversal(this, input, { success: true } as T);
    }

    async playTextChunk<T = Buffer>(textChunk: TextChunk): Promise<T> {
        this.validateText(textChunk.text);
        const processedText = this.processText(textChunk);
        const requestConfig = this.createRequestConfig(processedText);
        const result = await this.executePlayRequest(requestConfig);
        await this.waitForAudioToComplete();
        return { requestId: result.requestId } as T;
    }

    private validateText(text: string): void {
        if (!this.textProcessor.validateText(text)) {
            throw createError('INVALID_TEXT', 'Text validation failed');
        }
    }

    private processText(textChunk: TextChunk): string {
        return this.textProcessor.formatText(
            textChunk.text,
            textChunk.element || 'normal'
        );
    }

    private createRequestConfig(processedText: string): PlayRequestConfig {
        return {
            text: processedText,
            voiceId: this.config.voiceId,
            modelId: this.config.modelId,
        };
    }

    private async executePlayRequest(config: PlayRequestConfig): Promise<PlayResult> {
            try {
                this.cleanup();

                const response = await this.makeApiRequest(config);

                const { audioBlob, requestId } = await this.processApiResponse(response);

                const audio = await this.setupAudioPlayback(audioBlob);

                return { requestId, audio };

            } catch (error) {
                const ttsError = createNetworkAwareError(error, 'Azure Speech');
                this.emitEvent('end', { success: false, error: ttsError });
                throw ttsError;
            }
        }

    private async makeApiRequest(config: PlayRequestConfig): Promise<Response> {
        const response = await fetch('/api/tts/azure', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            throw createError('API_ERROR', `API Error: ${response.status} ${response.statusText}`);
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

        try {
            this.setupAudioEvents();
            await this.currentAudio.play();
            this.updatePlaybackState(true, false);
            this.emitEvent('play', { audio: this.currentAudio });
            return this.currentAudio;
        } catch (error) {
            // If playback fails, clean up the audio element and URL
            this.cleanup();
            URL.revokeObjectURL(audioUrl);
            throw error;
        }
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
                    handleDevelopmentError(error, `Azure Adapter Event Listener Error (${event})`);
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
            // Only emit TTS errors for audio we created (blob URLs)
            const isOurAudio = this.currentAudio?.src?.startsWith('blob:');

            if (isOurAudio) {
                this.updatePlaybackState(false, false);
                this.emitEvent('error', { error, audio: this.currentAudio });
            }
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

    private async waitForAudioToComplete(): Promise<void> {
        if (!this.currentAudio || !this.isPlaying) {
            return;
        }

        return new Promise<void>((resolve) => {
            const handleComplete = () => {
                this.currentAudio?.removeEventListener('ended', handleComplete);
                this.currentAudio?.removeEventListener('error', handleComplete);
                resolve();
            };

            this.currentAudio?.addEventListener('ended', handleComplete);
            this.currentAudio?.addEventListener('error', handleComplete);
        });
    }

    public cleanup(): void {
        if (this.currentAudio) {
            // Store the src for cleanup before clearing it
            const currentSrc = this.currentAudio.src;

            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio.src = '';
            this.currentAudio.load();

            // Revoke object URL to prevent memory leaks
            if (currentSrc?.startsWith('blob:')) {
                URL.revokeObjectURL(currentSrc);
            }

            this.currentAudio = null;
        }
        this.updatePlaybackState(false, false);
    }

    // === PLAYBACK CONTROL METHODS ===

    pause(): void {
        if (!this.canPause()) {
            return;
        }

        this.currentAudio!.pause();
        this.updatePlaybackState(false, true);
        this.emitEvent('pause', { audio: this.currentAudio });
    }

    resume(): void {
        if (!this.canResume()) {
            return;
        }

        this.currentAudio!.play().catch(error => {
            const ttsError = createNetworkAwareError(error, 'Azure Speech');
            this.emitEvent('error', { error: ttsError });
        });
        this.updatePlaybackState(true, false);
        this.emitEvent('resume', { audio: this.currentAudio });
    }

    stop(): void {
        if (!this.currentAudio) {
            return;
        }

        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.updatePlaybackState(false, false);
        this.emitEvent('stop', { audio: this.currentAudio });

        // Ensure complete cleanup to prevent multiple audio instances
        this.cleanup();
    }

    // === STATE QUERY METHODS ===

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    getIsPaused(): boolean {
        return this.isPaused;
    }

    getCurrentAudio(): HTMLAudioElement | null {
        return this.currentAudio;
    }

    // === HELPER METHODS ===

    private canPause(): boolean {
        return this.currentAudio !== null && this.isPlaying && !this.isPaused;
    }

    private canResume(): boolean {
        return this.currentAudio !== null && !this.isPlaying && this.isPaused;
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

    destroy(): void {
        this.cleanup();
        this.eventListeners.clear();
    }
}
