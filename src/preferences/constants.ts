export const TTS_CONSTANTS = {
    WORDS_PER_MINUTE: 150,
    MAX_TEXT_LENGTH: 5000,
    DEFAULT_MODEL: 'eleven_multilingual_v2',
    DEFAULT_VOICE_ID: 'JBFqnCBsd6RMkjVDRZzb',
    CHUNK_SIZE_FOR_TESTING: 1,
    MAX_CHUNKS: 5,
    // Reading modes
    ENABLE_WHOLE_PAGE_READING: false,
    // Mock TTS for testing to save API credits
    ENABLE_MOCK_TTS: process.env.NODE_ENV === 'test' || process.env.ENABLE_MOCK_TTS === 'true',
} as const;

export const IFRAME_SELECTORS = [
    'iframe.readium-navigator-iframe:not([style*="hidden"])',
    'iframe.readium-navigator-iframe',
    'iframe[class*="readium"]',
    'iframe[title="Readium"]',
    'iframe'
] as const;
