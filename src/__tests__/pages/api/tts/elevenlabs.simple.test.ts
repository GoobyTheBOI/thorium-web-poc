import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/elevenlabs';

// Mock the ElevenLabs client
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: jest.fn().mockReturnValue({
        withRawResponse: jest.fn().mockResolvedValue({
          data: {
            getReader: jest.fn().mockReturnValue({
              read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: jest.fn()
            })
          },
          rawResponse: {
            headers: {
              get: jest.fn().mockReturnValue('test-request-id')
            }
          }
        })
      })
    }
  }))
}));

describe('/api/tts/elevenlabs - Simple API Tests', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        text: 'Hello world',
        voiceId: 'test-voice-id',
        modelId: 'eleven_multilingual_v2'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    // Set environment variable for tests
    process.env.ELEVENLABS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ELEVENLABS_API_KEY;
  });

  test('returns error when API key is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ElevenLabs API key not configured',
      details: 'Please set ELEVENLABS_API_KEY in your environment variables'
    });
  });

  test('processes request with valid API key', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'test-request-id');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });

  test('handles missing text in request body', async () => {
    req.body = { voiceId: 'test-voice' }; // Missing text

    await handler(req as NextApiRequest, res as NextApiResponse);

    // Should not crash, either processes or returns error gracefully
    expect(res.status).toHaveBeenCalled();
  });

  test('handles ElevenLabs API errors gracefully', async () => {
    // Mock API error
    const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
    ElevenLabsClient.mockImplementation(() => ({
      textToSpeech: {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockRejectedValue(new Error('API Error'))
        })
      }
    }));

    // Set NODE_ENV to development to include error details
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate audio',
      details: 'API Error'
    });

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('includes request ID fallback when none provided', async () => {
    // Mock response without request ID
    const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
    ElevenLabsClient.mockImplementation(() => ({
      textToSpeech: {
        convert: jest.fn().mockReturnValue({
          withRawResponse: jest.fn().mockResolvedValue({
            data: {
              getReader: jest.fn().mockReturnValue({
                read: jest.fn()
                  .mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
                  .mockResolvedValueOnce({ done: true, value: undefined }),
                releaseLock: jest.fn()
              })
            },
            rawResponse: {
              headers: {
                get: jest.fn().mockReturnValue(null) // No request ID
              }
            }
          })
        })
      }
    }));

    // Mock Date.now for consistent fallback ID
    const mockNow = jest.spyOn(Date, 'now').mockReturnValue(1234567890);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'elevenlabs-1234567890');

    mockNow.mockRestore();
  });

  test('sets correct response headers', async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });
});
