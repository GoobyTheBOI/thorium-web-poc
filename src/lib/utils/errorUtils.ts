import { ITTSError } from '@/preferences/types';

/**
 * Network-aware error handling utilities for TTS adapters
 */

export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('connection') ||
            message.includes('offline') ||
            message.includes('no internet') ||
            error.name === 'NetworkError' ||
            error.name === 'TypeError' && message.includes('failed to fetch')
        );
    }

    // Check for fetch errors that might not have clear error messages
    if (error instanceof TypeError) {
        return true; // Most fetch failures throw TypeError
    }

    return false;
}

export function createError(code: string, message: string, details?: unknown): ITTSError {
    return {
        code,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
    };
}

export function extractErrorMessage(error: unknown, fallbackMessage = 'Unknown error occurred'): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    return fallbackMessage;
}

export function createNetworkAwareError(
    error: unknown,
    providerName: 'ElevenLabs' | 'Azure Speech'
): ITTSError {
    // Check if it's a network-related error
    if (isNetworkError(error)) {
        return createError(
            'NETWORK_ERROR',
            'Geen internetverbinding beschikbaar. Controleer uw netwerkverbinding en probeer opnieuw.',
            error
        );
    }

    // Check if it's an API error
    if (error instanceof Error) {
        if (error.message.includes('API Error: 401')) {
            return createError(
                'API_AUTH_ERROR',
                `Ongeldige API-sleutel voor ${providerName}. Controleer uw configuratie.`,
                error
            );
        }

        if (error.message.includes('API Error:')) {
            return createError(
                'API_ERROR',
                `${providerName} API fout: ${error.message}`,
                error
            );
        }
    }

    // Default error
    const providerAction = providerName === 'ElevenLabs' ? 'ElevenLabs' : 'Azure Speech';
    return createError(
        'PLAYBACK_FAILED',
        `Kan geen audio genereren met ${providerAction}. Probeer opnieuw of selecteer een andere TTS-provider.`,
        error
    );
}
