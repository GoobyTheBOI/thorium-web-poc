import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/elevenlabs';
import { TTSErrorResponse } from '../../../../types/tts';

// Mock the ElevenLabs client
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: jest.fn(),
}));

describe('/api/tts/elevenlabs', () => {
  const originalEnv = process.env;

  // Helper to create a mock ReadableStream
  const createMockStream = (data: Uint8Array[] = [new Uint8Array([1, 2, 3, 4])]) => {
    return new ReadableStream({
      start(controller) {
        data.forEach(chunk => controller.enqueue(chunk));
        controller.close();
      }
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration Validation', () => {
    test('returns 500 when ELEVENLABS_API_KEY is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs API key not configured');
      expect(data.details).toContain('ELEVENLABS_API_KEY');
    });

    test('returns 500 when ELEVENLABS_API_KEY is empty', async () => {
      process.env.ELEVENLABS_API_KEY = '';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs API key not configured');
    });
  });

  describe('Request Processing', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    test('successfully processes valid request with required fields', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.close();
        }
      });

      const mockResponse = {
        data: mockAudioStream,
        rawResponse: {
          headers: {
            get: jest.fn().mockReturnValue('test-request-id'),
          },
        },
      };

      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue(mockResponse),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(ElevenLabsClient).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });

      expect(mockTextToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: 'eleven_multilingual_v2',
      });

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('audio/mpeg');
      expect(res.getHeader('x-request-id')).toBe('test-request-id');
    });

    test('uses provided modelId when specified', async () => {
      const mockAudioStream = {
        pipe: jest.fn(),
        on: jest.fn(),
      };

      const mockResponse = {
        data: mockAudioStream,
        rawResponse: {
          headers: {
            get: jest.fn().mockReturnValue('test-request-id'),
          },
        },
      };

      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue(mockResponse),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      global.streamToBuffer = jest.fn().mockResolvedValue(Buffer.from('mock audio data'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id',
          modelId: 'eleven_turbo_v2'
        },
      });

      await handler(req, res);

      expect(mockTextToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: 'eleven_turbo_v2',
      });
    });

    test('uses default modelId when not specified', async () => {
      const mockAudioStream = {
        pipe: jest.fn(),
        on: jest.fn(),
      };

      const mockResponse = {
        data: mockAudioStream,
        rawResponse: {
          headers: {
            get: jest.fn().mockReturnValue('test-request-id'),
          },
        },
      };

      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue(mockResponse),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      global.streamToBuffer = jest.fn().mockResolvedValue(Buffer.from('mock audio data'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(mockTextToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: 'eleven_multilingual_v2',
      });
    });

    test('generates fallback request ID when not provided by API', async () => {
      const mockAudioStream = {
        pipe: jest.fn(),
        on: jest.fn(),
      };

      const mockResponse = {
        data: mockAudioStream,
        rawResponse: {
          headers: {
            get: jest.fn().mockReturnValue(null), // No request ID
          },
        },
      };

      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue(mockResponse),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      global.streamToBuffer = jest.fn().mockResolvedValue(Buffer.from('mock audio data'));

      // Mock Date.now for consistent testing
      const mockNow = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res.getHeader('x-request-id')).toBe(`elevenlabs-${mockNow}`);

      // Restore Date.now
      jest.restoreAllMocks();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    test('handles ElevenLabs API errors', async () => {
      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs TTS synthesis failed');
      expect(data.details).toBe('API rate limit exceeded');
    });

    test('handles stream processing errors', async () => {
      const mockAudioStream = {
        pipe: jest.fn(),
        on: jest.fn(),
      };

      const mockResponse = {
        data: mockAudioStream,
        rawResponse: {
          headers: {
            get: jest.fn().mockReturnValue('test-request-id'),
          },
        },
      };

      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue(mockResponse),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      global.streamToBuffer = jest.fn().mockRejectedValue(new Error('Stream processing failed'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs TTS synthesis failed');
      expect(data.details).toBe('Stream processing failed');
    });

    test('handles client initialization errors', async () => {
      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => {
        throw new Error('Invalid API key');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs TTS synthesis failed');
      expect(data.details).toBe('Invalid API key');
    });

    test('handles unknown errors gracefully', async () => {
      const mockTextToSpeech = {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockRejectedValue('Unknown error type'),
        }),
      };

      const mockClient = {
        textToSpeech: mockTextToSpeech,
      };

      const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('ElevenLabs TTS synthesis failed');
      expect(data.details).toBe('Unknown error occurred');
    });
  });
});
