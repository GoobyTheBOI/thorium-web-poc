import { TTSErrorResponse, TTSRequestBody } from '@/preferences/types';
import type { NextApiResponse } from 'next';

export interface BaseRequestData {
    text: string;
    voiceId?: string;
    modelId?: string;
}

/**
 * Validates that required text field is present
 */
export function validateRequiredText(text: string): void {
    if (!text) {
        throw new Error('Missing required fields: text is required');
    }
}

/**
 * Extracts common request data from request body
 */
export function extractBaseRequestData(body: unknown): BaseRequestData {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid request body');
    }

    const { text, voiceId, modelId } = body as TTSRequestBody;

    validateRequiredText(text);

    return { text, voiceId, modelId };
}

/**
 * Validates environment configuration for a specific provider
 */
export function validateEnvironmentConfig(envVars: Record<string, string | undefined>, providerName: string): void {
    const missingVars = Object.entries(envVars)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key);

    if (missingVars.length > 0) {
        throw new Error(`${providerName} API not configured. Please set ${missingVars.join(', ')} in your environment variables`);
    }
}

/**
 * Sends audio response with standard headers
 */
export function sendAudioResponse(
    res: NextApiResponse<Buffer | TTSErrorResponse>,
    audioBuffer: Buffer,
    provider: string,
    requestId?: string | null
): void {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    res.setHeader('x-request-id', requestId || `${provider}-${Date.now()}`);
    res.setHeader('x-provider', provider);

    res.status(200).send(audioBuffer);
}

/**
 * Determines appropriate HTTP status code based on error message
 */
export function getErrorStatusCode(errorMessage: string): number {
    if (errorMessage.includes('Missing required fields')) {
        return 400;
    } else if (errorMessage.includes('authentication') || errorMessage.includes('key') || errorMessage.includes('not configured')) {
        return 401;
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        return 429;
    } else if (errorMessage.includes('region') || errorMessage.includes('voice')) {
        return 400;
    }
    return 500;
}

/**
 * Standardized error response for TTS APIs
 */
export function handleTTSApiError(
    res: NextApiResponse<Buffer | TTSErrorResponse>,
    error: unknown,
    provider: string
): void {
    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
        errorMessage = error.message;
    }

    const statusCode = getErrorStatusCode(errorMessage);

    // Provide user-friendly error messages for common issues
    let userFriendlyMessage = errorMessage;
    if (statusCode === 401) {
        userFriendlyMessage = `Invalid or missing ${provider} API key`;
    } else if (statusCode === 429) {
        userFriendlyMessage = `${provider} API quota exceeded or rate limit reached`;
    } else if (statusCode === 400 && errorMessage.includes('voice')) {
        userFriendlyMessage = 'Invalid voice specified';
    }

    res.status(statusCode).json({
        error: `Failed to generate audio with ${provider}`,
        details: process.env.NODE_ENV === 'development' ? userFriendlyMessage : undefined
    });
}
