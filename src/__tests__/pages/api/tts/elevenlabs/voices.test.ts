import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/tts/elevenlabs/voices';
import { VoiceInfo } from '@/preferences/types';

// Mock the ElevenLabs client
const mockGetAll = jest.fn();
const mockElevenLabsClient = {
  voices: {
    getAll: mockGetAll,
  },
};

jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: jest.fn(() => mockElevenLabsClient),
}));

// Mock console.error to avoid noise in tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Sample ElevenLabs voice data for testing
const mockElevenLabsVoices = {
  voices: [
    {
      voiceId: 'voice-id-1',
      name: 'Rachel',
      labels: {
        language: 'en',
        gender: 'female',
      },
    },
    {
      voiceId: 'voice-id-2',
      name: 'Adam',
      labels: {
        language: 'en',
        gender: 'male',
      },
    },
    {
      voiceId: 'voice-id-3',
      name: 'Alice',
      labels: {
        language: 'en',
      }, // No gender specified
    },
    {
      voiceId: 'voice-id-4',
      name: null, // No name specified
      labels: {
        language: 'fr',
        gender: 'female',
      },
    },
    {
      voiceId: 'voice-id-5',
      name: 'Sofia',
      labels: null, // No labels
    },
    {
      voiceId: 'voice-id-6',
      name: 'David',
      // No labels property at all
    },
  ],
};

const expectedVoices: VoiceInfo[] = [
  {
    id: 'voice-id-1',
    name: 'Rachel',
    language: 'en',
    gender: 'female',
  },
  {
    id: 'voice-id-2',
    name: 'Adam',
    language: 'en',
    gender: 'male',
  },
  {
    id: 'voice-id-3',
    name: 'Alice',
    language: 'en',
    gender: undefined,
  },
  {
    id: 'voice-id-4',
    name: 'Unknown Voice',
    language: 'fr',
    gender: 'female',
  },
  {
    id: 'voice-id-5',
    name: 'Sofia',
    language: 'unknown',
    gender: undefined,
  },
  {
    id: 'voice-id-6',
    name: 'David',
    language: 'unknown',
    gender: undefined,
  },
];

describe('/api/tts/elevenlabs/voices', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    mockGetAll.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('HTTP Method Validation', () => {
    it('should return 405 for POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Method not allowed'
      });
    });

    it('should return 405 for PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Method not allowed'
      });
    });

    it('should return 405 for DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Method not allowed'
      });
    });

    it('should return 405 for PATCH requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Method not allowed'
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should return 500 when ELEVENLABS_API_KEY is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching voices from ElevenLabs:',
        expect.any(Error)
      );
    });

    it('should return 500 when ELEVENLABS_API_KEY is empty string', async () => {
      process.env.ELEVENLABS_API_KEY = '';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });

    it('should return 500 when ELEVENLABS_API_KEY is undefined', async () => {
      process.env.ELEVENLABS_API_KEY = undefined;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });
  });

  describe('Successful Voice Fetching', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should successfully fetch and transform voices', async () => {
      mockGetAll.mockResolvedValueOnce(mockElevenLabsVoices);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ voices: expectedVoices });

      expect(mockGetAll).toHaveBeenCalledTimes(1);
    });

    it('should handle empty voices array', async () => {
      mockGetAll.mockResolvedValueOnce({ voices: [] });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ voices: [] });
    });

    it('should handle voices with missing names', async () => {
      const voicesWithMissingNames = {
        voices: [
          {
            voiceId: 'test-voice-1',
            name: null,
            labels: {
              language: 'en',
              gender: 'female',
            },
          },
          {
            voiceId: 'test-voice-2',
            // name property missing entirely
            labels: {
              language: 'en',
              gender: 'male',
            },
          },
        ],
      };

      mockGetAll.mockResolvedValueOnce(voicesWithMissingNames);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.voices).toEqual([
        {
          id: 'test-voice-1',
          name: 'Unknown Voice',
          language: 'en',
          gender: 'female',
        },
        {
          id: 'test-voice-2',
          name: 'Unknown Voice',
          language: 'en',
          gender: 'male',
        },
      ]);
    });

    it('should handle voices with missing languages', async () => {
      const voicesWithMissingLanguages = {
        voices: [
          {
            voiceId: 'test-voice-1',
            name: 'Test Voice',
            labels: {
              gender: 'female',
            },
          },
          {
            voiceId: 'test-voice-2',
            name: 'Test Voice 2',
            labels: null,
          },
        ],
      };

      mockGetAll.mockResolvedValueOnce(voicesWithMissingLanguages);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.voices).toEqual([
        {
          id: 'test-voice-1',
          name: 'Test Voice',
          language: 'unknown',
          gender: 'female',
        },
        {
          id: 'test-voice-2',
          name: 'Test Voice 2',
          language: 'unknown',
          gender: undefined,
        },
      ]);
    });

    it('should handle voices with neutral gender', async () => {
      const voicesWithNeutralGender = {
        voices: [
          {
            voiceId: 'neutral-voice',
            name: 'Neutral Voice',
            labels: {
              language: 'en',
              gender: 'neutral',
            },
          },
        ],
      };

      mockGetAll.mockResolvedValueOnce(voicesWithNeutralGender);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.voices[0].gender).toBe('neutral');
    });

    it('should handle voices with undefined gender', async () => {
      const voicesWithUndefinedGender = {
        voices: [
          {
            voiceId: 'test-voice',
            name: 'Test Voice',
            labels: {
              language: 'en',
              gender: undefined,
            },
          },
        ],
      };

      mockGetAll.mockResolvedValueOnce(voicesWithUndefinedGender);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.voices[0].gender).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should handle ElevenLabs API errors', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockGetAll.mockRejectedValueOnce(apiError);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching voices from ElevenLabs:',
        apiError
      );
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      mockGetAll.mockRejectedValueOnce(authError);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockGetAll.mockRejectedValueOnce(networkError);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });

    it('should handle unexpected response format', async () => {
      // Mock a response that doesn't have the expected structure
      mockGetAll.mockResolvedValueOnce(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });

    it('should handle undefined response', async () => {
      mockGetAll.mockResolvedValueOnce(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });

    it('should handle response with no voices property', async () => {
      mockGetAll.mockResolvedValueOnce({});

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    });
  });

  describe('ElevenLabs Client Initialization', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should initialize ElevenLabs client with correct API key', async () => {
      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

      mockGetAll.mockResolvedValueOnce({ voices: [] });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(ElevenLabsClient).toHaveBeenCalledWith({
        apiKey: 'test-api-key'
      });
    });

    it('should call voices.getAll method', async () => {
      mockGetAll.mockResolvedValueOnce({ voices: [] });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(mockGetAll).toHaveBeenCalledTimes(1);
      expect(mockGetAll).toHaveBeenCalledWith();
    });
  });

  describe('Response Format Validation', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    it('should return response in correct format for successful requests', async () => {
      mockGetAll.mockResolvedValueOnce({ voices: [] });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('voices');
      expect(Array.isArray(data.voices)).toBe(true);
      expect(data).not.toHaveProperty('error');
    });

    it('should return response in correct format for error requests', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('voices');
      expect(data).toHaveProperty('error');
      expect(Array.isArray(data.voices)).toBe(true);
      expect(data.voices).toEqual([]);
      expect(typeof data.error).toBe('string');
    });
  });
});
