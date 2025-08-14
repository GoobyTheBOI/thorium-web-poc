import { TTSErrorResponse, TTSRequestBody } from '@/types/tts';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
    AudioConfig,
    SpeechConfig,
    SpeechSynthesizer,
    ResultReason,
    SpeechSynthesisResult,
    SpeechSynthesisOutputFormat
} from "microsoft-cognitiveservices-speech-sdk";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Buffer | TTSErrorResponse>
) {
    try {
        const {
            text,
            voiceId,
        } = req.body as TTSRequestBody;

        // Validate required fields
        if (!text) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'text is required'
            });
        }

        // Validate Azure configuration
        if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
            console.error('Azure Speech credentials not configured');
            return res.status(500).json({
                error: 'Azure Speech API not configured',
                details: 'Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in your environment variables'
            });
        }

        // Configure Azure Speech Service
        const speechConfig = SpeechConfig.fromSubscription(
            process.env.AZURE_SPEECH_KEY,
            process.env.AZURE_SPEECH_REGION
        );

        // Set the voice name (use voiceId if provided, otherwise default)
        const azureVoiceName = voiceId || process.env.AZURE_VOICE_NAME || 'en-US-AriaNeural';
        speechConfig.speechSynthesisVoiceName = azureVoiceName;

        // Set output format to MP3 for web compatibility
        speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

        // Use null audio config to get audio data in memory instead of file
        const audioConfig = AudioConfig.fromDefaultSpeakerOutput();

        // Create synthesizer
        const synthesizer = new SpeechSynthesizer(speechConfig, null);

        try {
            // Perform speech synthesis
            const result = await new Promise<SpeechSynthesisResult>((resolve, reject) => {
                synthesizer.speakTextAsync(
                    text,
                    (result) => {
                        resolve(result);
                    },
                    (error) => {
                        reject(new Error(`Azure Speech synthesis failed: ${error}`));
                    }
                );
            });

            // Check if synthesis was successful
            if (result.reason !== ResultReason.SynthesizingAudioCompleted) {
                console.error('Azure Speech synthesis failed:', result.errorDetails);
                return res.status(500).json({
                    error: 'Speech synthesis failed',
                    details: result.errorDetails || 'Unknown synthesis error'
                });
            }

            // Get audio data as buffer
            const audioBuffer = Buffer.from(result.audioData);

            if (!audioBuffer || audioBuffer.length === 0) {
                console.error('Azure Speech returned empty audio data');
                return res.status(500).json({
                    error: 'Empty audio data',
                    details: 'Azure Speech Service returned no audio content'
                });
            }

            // Set response headers
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length.toString());
            res.setHeader('x-request-id', `azure-${Date.now()}`);
            res.setHeader('x-provider', 'azure-speech');

            // Send the audio data
            return res.status(200).send(audioBuffer);

        } finally {
            if (synthesizer) {
                synthesizer.close();
            }
        }

    } catch (error) {
        console.error('❌ Azure Speech API Error:', error);

        let errorMessage = 'Unknown error occurred';
        let statusCode = 500;

        if (error instanceof Error) {
            errorMessage = error.message;

            // Handle specific Azure errors
            if (error.message.includes('authentication') || error.message.includes('key')) {
                statusCode = 401;
                errorMessage = 'Invalid or missing Azure Speech API key';
            } else if (error.message.includes('quota') || error.message.includes('limit')) {
                statusCode = 429;
                errorMessage = 'Azure Speech API quota exceeded or rate limit reached';
            } else if (error.message.includes('region')) {
                statusCode = 400;
                errorMessage = 'Invalid Azure region specified';
            } else if (error.message.includes('voice')) {
                statusCode = 400;
                errorMessage = 'Invalid voice name specified';
            }
        }

        return res.status(statusCode).json({
            error: 'Failed to generate audio with Azure Speech',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}
