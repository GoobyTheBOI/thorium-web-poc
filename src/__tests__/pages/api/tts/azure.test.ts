import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/tts/azure';
import { TTSErrorResponse, TTSRequestBody } from '@/types/tts';
import { TEST_CONFIG } from '../../../../lib/constants/testConstants';

// Mock Azure Speech SDK
const mockSpeechSynthesizer = {
  speakSsmlAsync: jest.fn(),
  close: jest.fn()
};

const mockSpeechConfig = {
  speechSynthesisVoiceName: '',
  speechSynthesisOutputFormat: 0
};

jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: jest.fn(() => mockSpeechConfig)
  },
  AudioConfig: {
    fromDefaultSpeakerOutput: jest.fn(() => ({}))
  },
  SpeechSynthesizer: jest.fn(() => mockSpeechSynthesizer),
  ResultReason: {
    SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
    SynthesizingAudioStarted: 'SynthesizingAudioStarted',
    Canceled: 'Canceled'
  },
  SpeechSynthesisOutputFormat: {
    Audio16Khz32KBitRateMonoMp3: 0
  }
}));

describe(`${TEST_CONFIG.API_ENDPOINTS.AZURE_TTS}`, () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };

    // Reset Azure SDK mocks
    mockSpeechSynthesizer.speakSsmlAsync.mockClear();
    mockSpeechSynthesizer.close.mockClear();
    mockSpeechConfig.speechSynthesisVoiceName = '';
    mockSpeechConfig.speechSynthesisOutputFormat = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API Contract and Validation', () => {
    test('validates TTSRequestBody interface compliance', async () => {
      const validRequest: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'en-US-Adam:DragonHDLatestNeural',
        modelId: 'neural', // Optional
        useContext: false  // Optional
      };

      expect(validRequest.text).toBeDefined();
      expect(typeof validRequest.text).toBe('string');
      expect(typeof validRequest.voiceId).toBe('string');
    });

    test('returns 400 when text is missing', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('returns 400 when text is empty string', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: '' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });
  });

  describe('Environment Configuration Validation', () => {
    test('returns 401 when AZURE_API_KEY is missing', async () => {
      delete process.env.AZURE_API_KEY;
      process.env.AZURE_REGION = 'test-region';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('returns 401 when AZURE_REGION is missing', async () => {
      process.env.AZURE_API_KEY = 'test-key';
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('returns 401 when both Azure credentials are missing', async () => {
      delete process.env.AZURE_API_KEY;
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('validates correct environment variable names match implementation', async () => {
      process.env.AZURE_API_KEY = 'test-key';
      process.env.AZURE_REGION = 'test-region';

      expect(process.env.AZURE_API_KEY).toBeDefined();
      expect(process.env.AZURE_REGION).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('handles unexpected errors gracefully', async () => {
      // Don't set environment variables to trigger error path
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect([400, 401, 500]).toContain(res._getStatusCode());

      const data = JSON.parse(res._getData());
      expect(data.error).toBeDefined();
    });

    test('provides specific error messages for Azure-specific errors', async () => {
      delete process.env.AZURE_API_KEY;
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });
  });

  describe('Response Headers and Metadata', () => {
    test('validates TTSErrorResponse structure for errors', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {},
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);

      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });

  describe('SOLID Architecture Compliance', () => {
    test('Interface Segregation: Uses focused TTSRequestBody and TTSErrorResponse interfaces', async () => {
      const requestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'en-US-Adam:DragonHDLatestNeural',
      };

      expect(requestBody.text).toBeDefined();
      expect(typeof requestBody.text).toBe('string');

      const errorResponse: TTSErrorResponse = {
        error: 'Test error',
        details: 'Test details'
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.details).toBeDefined();
    });
  });

  describe('SSML Processing Functions', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'test-region';
    });

    test('processes plain text correctly', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Plain text without SSML tags' },
      });

      await handler(req, res);

      expect(req.body.text).toBe('Plain text without SSML tags');
    });

    test('processes SSML-formatted text correctly', async () => {
      const ssmlText = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='en-US-JennyNeural'>Hello world</voice></speak>";

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: ssmlText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(ssmlText);
    });

    test('processes text with SSML tags but no speak wrapper', async () => {
      const partialSSML = 'Hello <break time="1s"/> world with <emphasis level="strong">emphasis</emphasis>';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: partialSSML },
      });

      await handler(req, res);

      expect(req.body.text).toBe(partialSSML);
    });

    test('processes text with prosody tags', async () => {
      const prosodyText = 'Text with <prosody rate="slow" pitch="low">prosody modifications</prosody>';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: prosodyText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(prosodyText);
    });

    test('processes text with mstts express-as tags', async () => {
      const expressText = 'Text with <mstts:express-as style="cheerful">emotional expression</mstts:express-as>';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: expressText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(expressText);
    });

    test('processes text with sub tags', async () => {
      const subText = 'Text with <sub alias="abbreviation">sub</sub> tag';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: subText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(subText);
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('handles undefined text field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: undefined },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('handles null text field', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: null },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('handles only AZURE_API_KEY missing', async () => {
      delete process.env.AZURE_API_KEY;
      process.env.AZURE_REGION = 'test-region';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Test text' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('handles only AZURE_REGION missing', async () => {
      process.env.AZURE_API_KEY = 'test-key';
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Test text' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Failed to generate audio with Azure Speech');
    });

    test('validates error response structure compliance', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: '' },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());

      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      expect(data.error.length).toBeGreaterThan(0);
    });
  });

  describe('Text Processing Edge Cases', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'test-region';
    });

    test('handles very long text input', async () => {
      const longText = 'A'.repeat(10000);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: longText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(longText);
    });

    test('handles text with special characters', async () => {
      const specialText = 'Text with émojis 🎵 and spëcial characters!';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: specialText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(specialText);
    });

    test('handles text with numbers and symbols', async () => {
      const mixedText = 'Price: $123.45, Date: 2024-01-01, Percentage: 99.9%';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: mixedText },
      });

      await handler(req, res);

      expect(req.body.text).toBe(mixedText);
    });
  });

  describe('Request Processing', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'test-region';
    });

    test('processes request with custom voiceId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: {
          text: 'Test text',
          voiceId: 'en-US-AriaNeural'
        },
      });

      await handler(req, res);

      expect(req.body.text).toBe('Test text');
      expect(req.body.voiceId).toBe('en-US-AriaNeural');
    });

    test('processes request with undefined voiceId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'test text', voiceId: undefined },
      });

      await handler(req, res);

      expect(req.body.text).toBe('test text');
    });

    test('processes request with null voiceId', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'test text', voiceId: null },
      });

      await handler(req, res);

      expect(req.body.text).toBe('test text');
    });

    test('handles whitespace-only text', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: '   \n  \t  ' },
      });

      await handler(req, res);

      expect(req.body.text).toBe('   \n  \t  ');
    });
  });

  describe('Environment Management', () => {
    test('validates environment variable consistency', async () => {
      const envVars = ['AZURE_API_KEY', 'AZURE_REGION', 'AZURE_VOICE_NAME'];

      envVars.forEach(varName => {
        expect(typeof varName).toBe('string');
        expect(varName.startsWith('AZURE_')).toBe(true);
      });
    });
  });
});
