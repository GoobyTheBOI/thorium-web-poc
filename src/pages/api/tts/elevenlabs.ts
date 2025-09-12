import { TTSErrorResponse } from '@/preferences/types';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { NextApiRequest, NextApiResponse } from 'next'
import {
    extractBaseRequestData,
    validateEnvironmentConfig,
    sendAudioResponse as sendStandardAudioResponse,
    handleTTSApiError
} from '@/lib/utils/ttsApiUtils';

interface ElevenLabsRequestData {
    text: string;
    voiceId: string;
    modelId: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Buffer | TTSErrorResponse>
) {
    try {
        const requestData = validateAndExtractRequestData(req.body);

        validateElevenLabsConfiguration();

        const elevenlabs = createElevenLabsClient();
        const { buffer, requestId } = await synthesizeSpeech(elevenlabs, requestData);

        sendAudioResponse(res, buffer, requestId);

    } catch (error) {
        handleTTSApiError(res, error, 'ElevenLabs');
    }
}

/**
 * Validates and extracts ElevenLabs-specific request data
 */
function validateAndExtractRequestData(body: unknown): ElevenLabsRequestData {
    const baseData = extractBaseRequestData(body);

    if (!baseData.voiceId) {
        throw new Error('Missing required fields: voiceId is required');
    }

    return {
        text: baseData.text,
        voiceId: baseData.voiceId,
        modelId: baseData.modelId || 'eleven_multilingual_v2'
    };
}

/**
 * Validates that ElevenLabs configuration is properly set up
 */
function validateElevenLabsConfiguration(): void {
    validateEnvironmentConfig({
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY
    }, 'ElevenLabs');
}

/**
 * Creates and configures the ElevenLabs client
 */
function createElevenLabsClient(): ElevenLabsClient {
    return new ElevenLabsClient({
        apiKey: process.env.ELEVENLABS_API_KEY!
    });
}

/**
 * Performs the actual speech synthesis using ElevenLabs
 */
async function synthesizeSpeech(
    elevenlabs: ElevenLabsClient,
    requestData: ElevenLabsRequestData
): Promise<{ buffer: Buffer; requestId: string | null }> {
    const response = await elevenlabs.textToSpeech
        .convert(requestData.voiceId, {
            text: requestData.text,
            modelId: requestData.modelId,
        })
        .withRawResponse();

    const audioBuffer = await streamToBuffer(response.data);
    const requestId = response.rawResponse.headers.get("request-id");

    return { buffer: audioBuffer, requestId };
}

/**
 * Sends the audio response with ElevenLabs-specific headers
 */
function sendAudioResponse(
    res: NextApiResponse<Buffer | TTSErrorResponse>,
    buffer: Buffer,
    requestId: string | null
): void {
    sendStandardAudioResponse(res, buffer, 'elevenlabs', requestId);
}

/**
 * Converts a ReadableStream to a Buffer
 */
async function streamToBuffer(audioStream: ReadableStream<Uint8Array>): Promise<Buffer> {
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
