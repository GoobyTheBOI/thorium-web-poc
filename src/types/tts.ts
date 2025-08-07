export interface TextChunk {
    text: string;
    element?: HTMLElement;
}

export interface TTSRequestChunk {
    text: string;
    element?: string;
}

export interface TTSRequestBody {
    text: TTSRequestChunk[];
    voiceId: string;
    modelId?: string;
    useContext?: boolean;
}

export interface TTSErrorResponse {
    error: string;
    details?: string;
}

export type ElementType = 'heading' | 'paragraph' | 'normal';

export interface TtsPlaybackResult {
    audioBuffer: Buffer;
    requestId: string | null;
}

// Constants
export const TTS_CONSTANTS = {
    WORDS_PER_MINUTE: 150,
    MAX_TEXT_LENGTH: 5000,
    DEFAULT_MODEL: 'eleven_multilingual_v2',
    DEFAULT_VOICE_ID: 'JBFqnCBsd6RMkjVDRZzb',
    CHUNK_SIZE_FOR_TESTING: 2,
    MAX_CHUNKS: 5,
} as const;

export const IFRAME_SELECTORS = [
    'iframe.readium-navigator-iframe:not([style*="hidden"])',
    'iframe.readium-navigator-iframe',
    'iframe[class*="readium"]',
    'iframe[title="Readium"]',
    'iframe'
] as const;
