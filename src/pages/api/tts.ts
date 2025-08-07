import { TTSErrorResponse, TTSRequestBody } from '@/types/tts';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { NextApiRequest, NextApiResponse } from 'next'


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Buffer | TTSErrorResponse>
) {


    try {
        const {
            text,
            voiceId,
            modelId = 'eleven_multilingual_v2',
            useContext = false,
            previousRequestIds
        } = req.body as TTSRequestBody;

        if (!process.env.ELEVENLABS_API_KEY) {
            console.warn('ElevenLabs API key not found, returning mock audio');

            return res.status(500).json({
                error: 'ElevenLabs API key not configured',
                details: 'Please set ELEVENLABS_API_KEY in your environment variables'
            });
        }

        const elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });

        const response = await elevenlabs.textToSpeech
            .convert(voiceId, {
                text: text,
                modelId,
                previousRequestIds: useContext ? previousRequestIds : undefined,
            })
            .withRawResponse();

        const audioBuffer = await streamToBuffer(response.data);
        const requestId = response.rawResponse.headers.get("request-id");

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('x-request-id', requestId || `elevenlabs-${Date.now()}`);

        return res.status(200).send(audioBuffer);


    } catch (error) {
        console.error('TTS API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            error: 'Failed to generate audio',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }

    // Helper function to convert stream to buffer
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
}
