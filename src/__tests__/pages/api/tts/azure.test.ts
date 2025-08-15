import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/azure';
import { TTSErrorResponse } from '../../../../types/tts';

// Mock the Azure Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn(),
  },
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(),
  },
  SpeechSynthesizer: jest.fn(),
  ResultReason: {
    SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
    Canceled: 'Canceled',
  },
  SpeechSynthesisOutputFormat: {
    Audio16Khz32KBitRateMonoMp3: 'Audio16Khz32KBitRateMonoMp3',
  },
}));

describe('/api/tts/azure', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Request Validation', () => {
    test('returns 400 when text is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Missing required fields');
      expect(data.details).toBe('text is required');
    });

    test('returns 400 when text is empty string', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: '' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Missing required fields');
    });

    test('accepts valid request with text only', async () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();
    });

    test('accepts valid request with text and voiceId', async () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'en-US-JennyNeural'
        },
      });

      await handler(req, res);

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();
    });
  });

  describe('Azure Configuration Validation', () => {
    test('returns 500 when AZURE_SPEECH_KEY is missing', async () => {
      delete process.env.AZURE_SPEECH_KEY;
      process.env.AZURE_SPEECH_REGION = 'test-region';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
      expect(data.details).toContain('AZURE_SPEECH_KEY');
    });

    test('returns 500 when AZURE_SPEECH_REGION is missing', async () => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      delete process.env.AZURE_SPEECH_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
      expect(data.details).toContain('AZURE_SPEECH_REGION');
    });

    test('returns 500 when both Azure credentials are missing', async () => {
      delete process.env.AZURE_SPEECH_KEY;
      delete process.env.AZURE_SPEECH_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
    });
  });

  describe('Azure Speech SDK Integration', () => {
    beforeEach(() => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';
    });

    test('configures speech service with environment variables', async () => {
      const mockSpeechConfig = {
        speechSynthesisVoiceName: '',
        speechSynthesisOutputFormat: '',
      };

      const { SpeechConfig } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechConfig.fromSubscription.mockReturnValue(mockSpeechConfig);

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(SpeechConfig.fromSubscription).toHaveBeenCalledWith('test-key', 'test-region');
    });

    test('uses provided voiceId', async () => {
      const mockSpeechConfig = {
        speechSynthesisVoiceName: '',
        speechSynthesisOutputFormat: '',
      };

      const { SpeechConfig } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechConfig.fromSubscription.mockReturnValue(mockSpeechConfig);

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Hello world',
          voiceId: 'en-US-JennyNeural'
        },
      });

      await handler(req, res);

      expect(mockSpeechConfig.speechSynthesisVoiceName).toBe('en-US-JennyNeural');
    });

    test('uses default voice when voiceId not provided', async () => {
      const mockSpeechConfig = {
        speechSynthesisVoiceName: '',
        speechSynthesisOutputFormat: '',
      };

      const { SpeechConfig } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechConfig.fromSubscription.mockReturnValue(mockSpeechConfig);

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(mockSpeechConfig.speechSynthesisVoiceName).toBe('en-US-AriaNeural');
    });

    test('uses environment AZURE_VOICE_NAME when available', async () => {
      process.env.AZURE_VOICE_NAME = 'en-US-ChristopherNeural';

      const mockSpeechConfig = {
        speechSynthesisVoiceName: '',
        speechSynthesisOutputFormat: '',
      };

      const { SpeechConfig } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechConfig.fromSubscription.mockReturnValue(mockSpeechConfig);

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(mockSpeechConfig.speechSynthesisVoiceName).toBe('en-US-ChristopherNeural');
    });
  });

  describe('Speech Synthesis', () => {
    beforeEach(() => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';
    });

    test('successfully synthesizes speech and returns audio buffer', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: mockAudioData,
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Content-Type')).toBe('audio/mp3');
      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    test('handles synthesis errors', async () => {
      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback, errorCallback) => {
          const error = new Error('Synthesis failed');
          errorCallback(error);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech synthesis failed');
      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    test('handles canceled synthesis result', async () => {
      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          const mockResult = {
            reason: 'Canceled',
            errorDetails: 'Synthesis was canceled',
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech synthesis failed');
      expect(data.details).toContain('Synthesis was canceled');
      expect(mockSynthesizer.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';
    });

    test('handles unexpected errors gracefully', async () => {
      const { SpeechConfig } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechConfig.fromSubscription.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });

    test('cleans up synthesizer on error', async () => {
      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          throw new Error('Synthesis error');
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('SSML Processing', () => {
    beforeEach(() => {
      process.env.AZURE_SPEECH_KEY = 'test-key';
      process.env.AZURE_SPEECH_REGION = 'test-region';
    });

    test('processes plain text into SSML', async () => {
      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          expect(ssml).toContain('<speak>');
          expect(ssml).toContain('Hello world');
          expect(ssml).toContain('</speak>');

          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();
    });

    test('handles special characters in text', async () => {
      const textWithSpecialChars = 'Hello & goodbye "world" <test>';

      const mockSynthesizer = {
        speakSsmlAsync: jest.fn((ssml, callback) => {
          // Should escape special XML characters
          expect(ssml).not.toContain('&');
          expect(ssml).not.toContain('<test>');
          expect(ssml).not.toContain('"world"');

          const mockResult = {
            reason: 'SynthesizingAudioCompleted',
            audioData: new ArrayBuffer(1024),
          };
          callback(mockResult);
        }),
        close: jest.fn(),
      };

      const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
      SpeechSynthesizer.mockImplementation(() => mockSynthesizer);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: textWithSpecialChars },
      });

      await handler(req, res);

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalled();
    });
  });
});
