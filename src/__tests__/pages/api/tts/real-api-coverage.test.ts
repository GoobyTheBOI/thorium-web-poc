// Test to get actual coverage on pages/api/tts by importing the handlers
import { NextApiRequest, NextApiResponse } from 'next';

// Import the actual API handlers to get coverage
import elevenLabsHandler from '../../../../pages/api/tts/elevenlabs';
import azureHandler from '../../../../pages/api/tts/azure';

// Mock external dependencies
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

jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn().mockReturnValue({
      speechSynthesisVoiceName: '',
      speechSynthesisOutputFormat: null
    })
  },
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn()
  },
  SpeechSynthesizer: jest.fn().mockImplementation(() => ({
    speakSsmlAsync: jest.fn().mockImplementation((ssml: any, callback: any) => {
      const mockResult = {
        reason: 'SynthesizingAudioCompleted',
        audioData: new ArrayBuffer(100)
      };
      callback(mockResult);
    }),
    close: jest.fn()
  })),
  ResultReason: {
    SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
    Canceled: 'Canceled'
  },
  SpeechSynthesisOutputFormat: {
    Audio16Khz32KBitRateMonoMp3: 'Audio16Khz32KBitRateMonoMp3'
  }
}));

describe('Real API Coverage Tests', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('ElevenLabs API Handler', () => {
    beforeEach(() => {
      process.env.ELEVENLABS_API_KEY = 'test-key';
    });

    afterEach(() => {
      delete process.env.ELEVENLABS_API_KEY;
    });

    test('handles missing API key', async () => {
      delete process.env.ELEVENLABS_API_KEY;
      req = { body: { text: 'Hello world' } };

      await elevenLabsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ElevenLabs API key not configured',
        details: 'Please set ELEVENLABS_API_KEY in your environment variables'
      });
    });

    test('processes valid request', async () => {
      req = { body: { text: 'Hello world', voiceId: 'test-voice' } };

      await elevenLabsHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Azure API Handler', () => {
    beforeEach(() => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';
    });

    afterEach(() => {
      delete process.env.AZURE_SPEECH_KEY;
      delete process.env.AZURE_SPEECH_REGION;
    });

    test('validates required text field', async () => {
      req = { body: {} };

      await azureHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
        details: 'text is required'
      });
    });

    test('handles missing Azure credentials', async () => {
      delete process.env.AZURE_SPEECH_KEY;
      req = { body: { text: 'Hello world' } };

      await azureHandler(req as NextApiRequest, res as NextApiResponse);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Azure Speech API not configured',
        details: 'Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in your environment variables'
      });
    });

    test('processes valid request', async () => {
      req = { body: { text: 'Hello world', voiceId: 'en-US-AriaNeural' } };

      await azureHandler(req as NextApiRequest, res as NextApiResponse);

      // Should call the Azure SDK and complete successfully
      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      expect(SpeechSynthesizer).toHaveBeenCalled();
    });
  });

  test('API handlers are properly imported', () => {
    expect(typeof elevenLabsHandler).toBe('function');
    expect(typeof azureHandler).toBe('function');
    expect(elevenLabsHandler.name).toBe('handler');
    expect(azureHandler.name).toBe('handler');
  });
});
