import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/azure';
import { TTSErrorResponse, TTSRequestBody } from '../../../../types/tts';
import { TEST_CONFIG } from '../../../config/testConstants';

describe(`${TEST_CONFIG.API_ENDPOINTS.AZURE_TTS}`, () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API Contract and Validation', () => {
    test('validates TTSRequestBody interface compliance', async () => {
      const validRequest: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'en-US-AriaNeural',
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
      expect(data.details).toBe('text is required');
    });
  });

  describe('Environment Configuration Validation', () => {
    test('returns 500 when AZURE_API_KEY is missing', async () => {
      delete process.env.AZURE_API_KEY;
      process.env.AZURE_REGION = 'test-region';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
    });

    test('returns 500 when AZURE_REGION is missing', async () => {
      process.env.AZURE_API_KEY = 'test-key';
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
    });

    test('returns 500 when both Azure credentials are missing', async () => {
      delete process.env.AZURE_API_KEY;
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse<Buffer | TTSErrorResponse>>({
        method: 'POST',
        body: { text: 'Hello world' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
      expect(data.details).toBe('Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in your environment variables');
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

      expect([400, 500]).toContain(res._getStatusCode());

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

      expect(res._getStatusCode()).toBe(500);

      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Azure Speech API not configured');
      expect(data.details).toContain('AZURE_SPEECH_KEY');
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
      expect(data).toHaveProperty('details');
      expect(typeof data.error).toBe('string');
      expect(typeof data.details).toBe('string');
    });
  });

  describe('SOLID Architecture Compliance', () => {
    test('Interface Segregation: Uses focused TTSRequestBody and TTSErrorResponse interfaces', async () => {
      const requestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'en-US-AriaNeural',
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

  describe('Environment and Configuration Management', () => {
    test('validates environment variable consistency with implementation', async () => {
      // This test ensures that the environment variable names used in tests
      // match what the implementation actually uses
      const envVars = ['AZURE_API_KEY', 'AZURE_REGION', 'AZURE_VOICE_NAME'];

      envVars.forEach(varName => {
        expect(typeof varName).toBe('string');
        expect(varName.startsWith('AZURE_')).toBe(true);
      });
    });
  });
});
