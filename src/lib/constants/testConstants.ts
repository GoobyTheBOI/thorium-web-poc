export const TEST_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  API_ENDPOINTS: {
    AZURE_TTS: '/api/tts/azure',
    ELEVENLABS_TTS: '/api/tts/elevenlabs',
    AZURE_VOICES: '/api/tts/azure/voices',
    ELEVENLABS_VOICES: '/api/tts/elevenlabs/voices'
  },
  TIMEOUTS: {
    API_CALL: 5000,
    TTS_GENERATION: 30000,
    VOICE_LOADING: 10000
  },
  TEST_DATA: {
    VOICE_IDS: {
      AZURE: 'test-voice-id',
      ELEVENLABS: 'test-voice-id',
      GENERIC: 'test-voice'
    },
    API_KEYS: {
      ELEVENLABS: 'test-api-key',
      AZURE: 'test-azure-key'
    },
    MODEL_IDS: {
      ELEVENLABS_MULTILINGUAL: 'eleven_multilingual_v2',
      ELEVENLABS_TURBO: 'eleven_turbo_v2'
    },
    SAMPLE_TEXT: 'Hello, this is a test.',
    SAMPLE_LONG_TEXT: 'This is a longer sample text for testing text-to-speech functionality with multiple sentences.',
    SIMPLE_TEXT: 'Hello world',
    SHORT_TEXT: 'Hello',
    PERFORMANCE_TEXT: 'Sample text for performance testing'
  }
} as const;

export const createTestUrl = (endpoint: string) => `${TEST_CONFIG.BASE_URL}${endpoint}`;
