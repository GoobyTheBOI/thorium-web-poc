export interface TextChunk {
    text: string;
    element?: string;
}

export interface TTSRequestBody {
    text: string;
    voiceId: string;
    modelId?: string;
    useContext?: boolean;
}

export interface TTSErrorResponse {
    error: string;
    details?: string;
}

export type ElementType = 'heading' | 'paragraph' | 'italic' | 'bold' | 'normal' | 'code';

export interface TtsPlaybackResult {
    audioBuffer: Buffer;
    requestId: string | null;
}

// TODO: Move this file to @/preferences/constants.ts and the interface to @/preferences/types.ts and edit imports accordingly
export const TTS_CONSTANTS = {
    WORDS_PER_MINUTE: 150,
    MAX_TEXT_LENGTH: 5000,
    DEFAULT_MODEL: 'eleven_multilingual_v2',
    DEFAULT_VOICE_ID: 'JBFqnCBsd6RMkjVDRZzb',
    CHUNK_SIZE_FOR_TESTING: 3,
    MAX_CHUNKS: 5,
    // Reading modes
    ENABLE_WHOLE_PAGE_READING: false,
} as const;

export const IFRAME_SELECTORS = [
    'iframe.readium-navigator-iframe:not([style*="hidden"])',
    'iframe.readium-navigator-iframe',
    'iframe[class*="readium"]',
    'iframe[title="Readium"]',
    'iframe'
] as const;
