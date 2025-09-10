import { TTSErrorResponse, TTSRequestBody } from '@/types/tts';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
    SpeechConfig,
    SpeechSynthesizer,
    ResultReason,
    SpeechSynthesisResult,
    SpeechSynthesisOutputFormat
} from "microsoft-cognitiveservices-speech-sdk";
import {
    extractBaseRequestData,
    validateEnvironmentConfig,
    sendAudioResponse as sendStandardAudioResponse,
    handleTTSApiError
} from '@/lib/utils/ttsApiUtils';

interface AzureRequestData {
    text: string;
    voiceId?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Buffer | TTSErrorResponse>
) {
    try {
        const requestData = validateAndExtractRequestData(req.body);

        validateAzureConfiguration();

        const speechConfig = createSpeechConfiguration(requestData.voiceId);
        const speechSynthesizer = new SpeechSynthesizer(speechConfig, null);

        try {
            const audioBuffer = await synthesizeSpeech(speechSynthesizer, requestData.text, requestData.voiceId);

            sendAudioResponse(res, audioBuffer);
        } finally {
            speechSynthesizer?.close();
        }

    } catch (error) {
        handleTTSApiError(res, error, 'Azure Speech');
    }
}

/**
 * Validates and extracts Azure-specific request data
 */
function validateAndExtractRequestData(body: unknown): AzureRequestData {
    const baseData = extractBaseRequestData(body);
    return { text: baseData.text, voiceId: baseData.voiceId };
}

/**
 * Validates that Azure configuration is properly set up
 */
function validateAzureConfiguration(): void {
    validateEnvironmentConfig({
        AZURE_API_KEY: process.env.AZURE_API_KEY,
        AZURE_REGION: process.env.AZURE_REGION
    }, 'Azure Speech');
}

/**
 * Creates and configures the Azure Speech Service configuration
 */
function createSpeechConfiguration(voiceId?: string): SpeechConfig {
    const speechConfig = SpeechConfig.fromSubscription(
        process.env.AZURE_API_KEY!,
        process.env.AZURE_REGION!
    );

    const azureVoiceName = voiceId || process.env.AZURE_VOICE_NAME || 'en-US-AdamNeural';

    speechConfig.speechSynthesisVoiceName = azureVoiceName;
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    return speechConfig;
}

/**
 * Performs the actual speech synthesis using Azure's Speech Service
 */
async function synthesizeSpeech(
    speechSynthesizer: SpeechSynthesizer,
    text: string,
    voiceId?: string
): Promise<Buffer> {
    const azureVoiceName = voiceId || process.env.AZURE_VOICE_NAME || 'en-US-AdamNeural';
    const processedText = createSSML(text, azureVoiceName);

    const result = await new Promise<SpeechSynthesisResult>((resolve, reject) => {
        speechSynthesizer.speakSsmlAsync(
            processedText,
            (result) => resolve(result),
            (error) => reject(new Error(`Azure Speech synthesis failed: ${error}`))
        );
    });

    if (result.reason !== ResultReason.SynthesizingAudioCompleted) {
        throw new Error(result.errorDetails || 'Speech synthesis failed');
    }

    const audioBuffer = Buffer.from(result.audioData);

    if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Azure Speech Service returned no audio content');
    }

    return audioBuffer;
}

/**
 * Sends the audio response with Azure-specific headers
 */
function sendAudioResponse(res: NextApiResponse<Buffer | TTSErrorResponse>, audioBuffer: Buffer): void {
    sendStandardAudioResponse(res, audioBuffer, 'azure-speech');
}

/**
 * Checks if the given text is already valid SSML
 */
function isSSML(text: string): boolean {
    return text.trim().startsWith('<speak') && text.trim().endsWith('</speak>');
}

/**
 * Converts text to proper SSML format for Azure Speech Service
 */
function createSSML(text: string, voiceName: string): string {
    if (isSSML(text)) {
        return text;
    }

    // Check if text already contains SSML markup from TextProcessor
    const hasSSMLMarkup = text.includes('<emphasis>') || text.includes('<prosody>') || text.includes('<break');

    if (hasSSMLMarkup) {
        // Text has SSML markup from TextProcessor, wrap it properly
        return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'>
            <voice name='${voiceName}'>${text}</voice>
        </speak>`;
    } else {
        // Plain text, wrap in basic SSML structure
        return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'>
            <voice name='${voiceName}'>${text}</voice>
        </speak>`;
    }
}
