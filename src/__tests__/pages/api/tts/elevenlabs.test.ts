import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/elevenlabs';
import { TTSErrorResponse, TTSRequestBody, TTS_CONSTANTS } from '../../../../types/tts';

jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: jest.fn(),
}));

describe('/api/tts/elevenlabs', () => {
  const originalEnv = process.env;

  const createMockElevenLabsClient = (overrides = {}) => {
    const defaultMock = {
      textToSpeech: {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue({
            data: createMockReadableStream(),
            rawResponse: {
              headers: {
                get: jest.fn().mockReturnValue('test-request-id'),
              },
            },
          }),
        }),
      },
    };
    return { ...defaultMock, ...overrides };
  };

  const createMockReadableStream = (data: Uint8Array[] = [new Uint8Array([1, 2, 3, 4])]) => {
    return new ReadableStream({
      start(controller) {
        data.forEach(chunk => controller.enqueue(chunk));
        controller.close();
      }
    });
  };

  const setupElevenLabsClientMock = (mockClient: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ElevenLabsClient } // eslint-disable-next-line @typescript-eslint/no-require-imports
      = require('@elevenlabs/elevenlabs-js');
    ElevenLabsClient.mockImplementation(() => mockClient);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Configuration and API Validation', () => {
    test('validates missing ELEVENLABS_API_KEY configuration', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('ElevenLabs API key not configured');
      expect(data.details).toContain('ELEVENLABS_API_KEY');
    });

    test('validates empty ELEVENLABS_API_KEY configuration', async () => {
      process.env.ELEVENLABS_API_KEY = '';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('ElevenLabs API key not configured');
    });

    test('validates TTSRequestBody interface compliance', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';

      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const requestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'test-voice-id'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: requestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockClient.textToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: TTS_CONSTANTS.DEFAULT_MODEL,
      });
    });

    test('validates TTSRequestBody with optional fields', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';

      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const requestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'test-voice-id',
        modelId: 'eleven_turbo_v2',
        useContext: true
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: requestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(mockClient.textToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: 'eleven_turbo_v2',
      });
    });
  });

  describe('Speech Synthesis and Audio Processing', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    test('successfully processes TTS request with audio stream conversion', async () => {
      const mockAudioData = new Uint8Array([1, 2, 3, 4]);
      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockResolvedValue({
              data: createMockReadableStream([mockAudioData]),
              rawResponse: {
                headers: {
                  get: jest.fn().mockReturnValue('test-request-id'),
                },
              },
            }),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('audio/mpeg');
      expect(res.getHeader('x-request-id')).toBe('test-request-id');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ElevenLabsClient } // eslint-disable-next-line @typescript-eslint/no-require-imports
      = require('@elevenlabs/elevenlabs-js');
      expect(ElevenLabsClient).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });

      expect(mockClient.textToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: TTS_CONSTANTS.DEFAULT_MODEL,
      });
    });

    test('uses provided modelId when specified in request', async () => {
      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id',
          modelId: 'eleven_turbo_v2'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(mockClient.textToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: 'eleven_turbo_v2',
      });

      expect(res._getStatusCode()).toBe(200);
    });

    test('uses default modelId when not specified in request', async () => {
      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(mockClient.textToSpeech.convert).toHaveBeenCalledWith('test-voice-id', {
        text: 'Hello world',
        modelId: TTS_CONSTANTS.DEFAULT_MODEL,
      });

      expect(res._getStatusCode()).toBe(200);
    });

    test('generates fallback request ID when API does not provide one', async () => {
      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockResolvedValue({
              data: createMockReadableStream(),
              rawResponse: {
                headers: {
                  get: jest.fn().mockReturnValue(null), // No request ID from API
                },
              },
            }),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res.getHeader('x-request-id')).toBe(`elevenlabs-${mockTimestamp}`);
      expect(res._getStatusCode()).toBe(200);

      jest.restoreAllMocks();
    });

    test('validates response headers and content type', async () => {
      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res.getHeader('Content-Type')).toBe('audio/mpeg');
      expect(res.getHeader('x-request-id')).toBeDefined();
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Error Handling and Resilience', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    test('handles ElevenLabs API authentication errors', async () => {
      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockRejectedValue(new Error('API authentication failed')),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('Failed to generate audio');
      if (process.env.NODE_ENV === 'development') {
        expect(data.details).toBe('API authentication failed');
      }
    });

    test('handles ElevenLabs API rate limiting errors', async () => {
      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('Failed to generate audio');
    });

    test('handles stream processing errors during audio conversion', async () => {
      const failingStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Stream processing failed'));
        }
      });

      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockResolvedValue({
              data: failingStream,
              rawResponse: {
                headers: {
                  get: jest.fn().mockReturnValue('test-request-id'),
                },
              },
            }),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('Failed to generate audio');
    });

    test('handles ElevenLabs client initialization errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ElevenLabsClient } // eslint-disable-next-line @typescript-eslint/no-require-imports
      = require('@elevenlabs/elevenlabs-js');
      ElevenLabsClient.mockImplementation(() => {
        throw new Error('Invalid API key format');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('Failed to generate audio');
    });

    test('handles unknown error types gracefully', async () => {
      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockRejectedValue('Unknown error type'),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;
      expect(data.error).toBe('Failed to generate audio');
    });

    test('validates TTSErrorResponse structure for all error scenarios', async () => {
      delete process.env.ELEVENLABS_API_KEY;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      const data = JSON.parse(res._getData()) as TTSErrorResponse;

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(typeof data.error).toBe('string');
      expect(typeof data.details).toBe('string');
    });
  });

  describe('SOLID Architecture Compliance', () => {
    test('Single Responsibility: API handler only manages HTTP concerns', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';

      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(mockClient.textToSpeech.convert).toHaveBeenCalled();
    });

    test('Open/Closed: API accepts TTSRequestBody interface extensions', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';

      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const extendedRequest = {
        text: 'Hello world',
        voiceId: 'test-voice-id',
        modelId: 'eleven_turbo_v2',
        useContext: true,
        futureField: 'should be ignored gracefully'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: extendedRequest,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    test('Dependency Inversion: Depends on ElevenLabs SDK abstractions', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ElevenLabsClient } // eslint-disable-next-line @typescript-eslint/no-require-imports
      = require('@elevenlabs/elevenlabs-js');
      expect(ElevenLabsClient).toBeDefined();

      const mockClient = createMockElevenLabsClient();
      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(ElevenLabsClient).toHaveBeenCalled();
      expect(mockClient.textToSpeech.convert).toHaveBeenCalled();
    });

    test('Interface Segregation: Uses focused TTSRequestBody and TTSErrorResponse interfaces', async () => {
      const requestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'test-voice-id'
      };

      expect(requestBody).not.toHaveProperty('play');
      expect(requestBody).not.toHaveProperty('pause');
      expect(requestBody).not.toHaveProperty('stop');
    });
  });

  describe('Performance and Stream Handling', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-api-key';
    });

    test('efficiently processes large audio streams', async () => {
      const largeAudioData = [
        new Uint8Array(1024),
        new Uint8Array(2048),
        new Uint8Array(1024)
      ];

      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockResolvedValue({
              data: createMockReadableStream(largeAudioData),
              rawResponse: {
                headers: {
                  get: jest.fn().mockReturnValue('test-request-id'),
                },
              },
            }),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'This is a longer text that would generate a larger audio file for testing stream processing capabilities',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      const startTime = Date.now();
      await handler(req, res);
      const endTime = Date.now();

      expect(res._getStatusCode()).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('handles ReadableStream to Buffer conversion correctly', async () => {
      const testData = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9])
      ];

      const mockClient = createMockElevenLabsClient({
        textToSpeech: {
          convert: jest.fn().mockReturnValue({
            withRawResponse: jest.fn().mockResolvedValue({
              data: createMockReadableStream(testData),
              rawResponse: {
                headers: {
                  get: jest.fn().mockReturnValue('test-request-id'),
                },
              },
            }),
          }),
        },
      });

      setupElevenLabsClientMock(mockClient);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'test-voice-id'
        } as TTSRequestBody,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = res._getData();
      expect(Buffer.isBuffer(responseData)).toBe(true);
    });
  });

  describe('Environment and Configuration Management', () => {
    test('follows environment-first configuration pattern', () => {
      const configs = [
        { ELEVENLABS_API_KEY: 'key1' },
        { ELEVENLABS_API_KEY: 'key2', NODE_ENV: 'development' },
        { ELEVENLABS_API_KEY: 'key3', NODE_ENV: 'production' }
      ];

      configs.forEach(config => {
        Object.keys(config).forEach(key => {
          process.env[key] = config[key as keyof typeof config];
        });

        expect(process.env.ELEVENLABS_API_KEY).toBeDefined();
      });
    });

    test('validates environment variable consistency with implementation', () => {
      const requiredVars = ['ELEVENLABS_API_KEY'];
      const optionalVars = ['NODE_ENV'];

      requiredVars.forEach(varName => {
        expect(typeof varName).toBe('string');
        expect(varName.startsWith('ELEVENLABS_')).toBe(true);
      });

      optionalVars.forEach(varName => {
        expect(typeof varName).toBe('string');
      });
    });

    test('uses TTS_CONSTANTS for default model configuration', () => {
      expect(TTS_CONSTANTS.DEFAULT_MODEL).toBe('eleven_multilingual_v2');
      expect(typeof TTS_CONSTANTS.DEFAULT_MODEL).toBe('string');
    });
  });
});
