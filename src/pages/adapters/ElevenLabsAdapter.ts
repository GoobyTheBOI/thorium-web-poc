import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Constants
const TTS_LIMITS = {
    MAX_TEXT_LENGTH: 5000,
    DEFAULT_MODEL: 'eleven_multilingual_v2'
} as const;

export class ElevenLabsAdapter implements IElevenLabsAdapter {
    private readonly apiKey: string = 'sk_5e18504dc60abfe7e3e591de22422f7b5e8582709a51b048';
    private readonly voiceId: string;
    private readonly modelId: string;
    private readonly elevenlabs: ElevenLabsClient;

    constructor(voiceId: string, modelId?: string) {
        if (!voiceId) {
            throw new Error('VoiceId is required for ElevenLabsAdapter');
        }

        if (!this.apiKey) {
            throw new Error('API key is required for ElevenLabsAdapter');
        }

        this.voiceId = voiceId;
        this.modelId = modelId || TTS_LIMITS.DEFAULT_MODEL;
        this.elevenlabs = new ElevenLabsClient({
            apiKey: this.apiKey,
        });
    }
    playWithContext<T = Buffer<ArrayBufferLike>>(text: string, requestIds?: string[]): Promise<{ audioBuffer: Buffer; requestId: string | null; }> {
        throw new Error('Method not implemented.');
    }

    // Text validation helper
    private validateText(text: string): void {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Text is required and must be a non-empty string');
        }

        if (text.length > TTS_LIMITS.MAX_TEXT_LENGTH) {
            throw new Error(`Text must be less than ${TTS_LIMITS.MAX_TEXT_LENGTH} characters`);
        }
    }

    // New method to handle request IDs for context continuity
    async playWithRequestIds(text: string, previousRequestIds?: string[]): Promise<{ audioBuffer: Buffer; requestId: string | null }> {
        this.validateText(text);

        try {
            // Use withRawResponse to get request IDs for context continuity
            const response = await this.elevenlabs.textToSpeech
                .convert(this.voiceId, {
                    text,
                    modelId: this.modelId,
                    previousRequestIds: previousRequestIds, // Use previous request IDs for context
                })
                .withRawResponse();

            // Convert stream to buffer
            const audioBuffer = await this.streamToBuffer(response.data);

            // Get the request ID from headers
            const requestId = response.rawResponse.headers.get("request-id");

            return {
                audioBuffer,
                requestId
            };
        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            throw new Error('Failed to generate audio with ElevenLabs');
        }
    }

    async play<T = Buffer>(text: string): Promise<T> {
        this.validateText(text);

        try {
            const audioStream = await this.elevenlabs.textToSpeech.stream(this.voiceId, {
                text,
                modelId: this.modelId,
            });

            return await this.streamToBuffer(audioStream) as T;
        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            throw new Error('Failed to generate audio with ElevenLabs');
        }
    }

    pause(): void {
        // Implementation for pausing playback - placeholder for future implementation
        console.log('Pause functionality not yet implemented');
    }

    resume(): void {
        // Implementation for resuming playback - placeholder for future implementation
        console.log('Resume functionality not yet implemented');
    }

    stop(): void {
        // Implementation for stopping playback - placeholder for future implementation
        console.log('Stop functionality not yet implemented');
    }

    on(event: 'wordBoundary' | 'end', callback: (info: any) => void): void {
        // Implementation for handling events - placeholder for future implementation
        console.log(`Event handler for ${event} not yet implemented`);
    }

    private async streamToBuffer(audioStream: ReadableStream<Uint8Array>): Promise<Buffer> {
        const chunks: Uint8Array[] = [];
        const reader = audioStream.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            return Buffer.concat(chunks);
        } finally {
            reader.releaseLock();
        }
    }
}
