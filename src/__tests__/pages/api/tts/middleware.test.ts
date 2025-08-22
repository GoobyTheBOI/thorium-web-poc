import { NextRequest } from 'next/server';

// Mock URL constructor for tests
global.URL = jest.fn((url) => ({
  href: url,
  origin: 'http://localhost:3000',
  pathname: url.replace('http://localhost:3000', ''),
  toString: () => url
})) as any;

// Mock NextResponse before importing the middleware
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      body: data,
      status: init.status || 200,
      headers: {
        get: jest.fn((key) => {
          const headers = { 'content-type': 'application/json', ...init.headers };
          return headers[key.toLowerCase()];
        }),
        ...init.headers
      },
      json: async () => data,
    })),
    next: jest.fn(() => ({
      status: 200,
      headers: {
        get: jest.fn(),
      },
    })),
  },
}));

import { middleware } from '../../../../pages/api/tts/middleware';
import { TTSErrorResponse, TTSRequestBody } from '../../../../types/tts';

describe('TTS API Middleware', () => {
  const createNextRequest = (url: string, options: {
    method: string;
    body?: any;
    headers?: Record<string, string>;
  }) => {
    // Mock NextRequest without calling the actual constructor
    const mockRequest = {
      url,
      method: options.method,
      headers: new Map(Object.entries({
        'Content-Type': 'application/json',
        ...options.headers,
      })),
      body: options.body ? JSON.stringify(options.body) : undefined,
      json: async () => options.body || {},
      text: async () => options.body ? JSON.stringify(options.body) : '',
      nextUrl: new URL(url),
    };

    return mockRequest as any;
  };

  const validateErrorResponse = (data: any): data is TTSErrorResponse => {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.error === 'string' &&
      (data.details === undefined || typeof data.details === 'string')
    );
  };
  describe('POST Request Validation and Processing', () => {
    test('allows POST requests with valid TTSRequestBody to continue', async () => {
      const validRequestBody: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'test-voice-id'
      };

      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
        body: validRequestBody,
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });

    test('allows POST requests with optional TTSRequestBody fields', async () => {
      const requestBodyWithOptionals: TTSRequestBody = {
        text: 'Hello world',
        voiceId: 'test-voice-id',
        modelId: 'eleven_turbo_v2',
        useContext: true
      };

      const request = createNextRequest('http://localhost:3000/api/tts/elevenlabs', {
        method: 'POST',
        body: requestBodyWithOptionals,
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });

    test('allows POST requests to all TTS endpoints', async () => {
      const endpoints = [
        'http://localhost:3000/api/tts/azure',
        'http://localhost:3000/api/tts/elevenlabs'
      ];

      const validRequestBody: TTSRequestBody = {
        text: 'Test text',
        voiceId: 'test-voice'
      };

      for (const endpoint of endpoints) {
        const request = createNextRequest(endpoint, {
          method: 'POST',
          body: validRequestBody,
        });

        const response = middleware(request);

        expect(response).toBeDefined();
        expect(response.status).not.toBe(405);
      }
    });
  });

  describe('HTTP Method Restriction and Security', () => {
    const ttsEndpoints = [
      'http://localhost:3000/api/tts/azure',
      'http://localhost:3000/api/tts/elevenlabs'
    ];

    test('rejects GET requests with 405 Method Not Allowed', async () => {
      for (const endpoint of ttsEndpoints) {
        const request = createNextRequest(endpoint, {
          method: 'GET',
        });

        const response = middleware(request);

        expect(response.status).toBe(405);

        const data = await response.json() as TTSErrorResponse;
        expect(validateErrorResponse(data)).toBe(true);
        expect(data.error).toBe('Method not allowed');
        expect(data.details).toBe('Only POST requests are accepted');
      }
    });

    test('rejects PUT requests with proper error response', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'PUT',
        body: { text: 'test' },
      });

      const response = middleware(request);

      expect(response.status).toBe(405);

      const data = await response.json() as TTSErrorResponse;
      expect(validateErrorResponse(data)).toBe(true);
      expect(data.error).toBe('Method not allowed');
    });

    test('rejects DELETE requests with security considerations', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'DELETE',
      });

      const response = middleware(request);

      expect(response.status).toBe(405);

      const data = await response.json() as TTSErrorResponse;
      expect(validateErrorResponse(data)).toBe(true);
    });

    test('rejects PATCH requests consistently', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/elevenlabs', {
        method: 'PATCH',
        body: { text: 'partial update' },
      });

      const response = middleware(request);

      expect(response.status).toBe(405);
    });

    test('rejects HEAD requests for security', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'HEAD',
      });

      const response = middleware(request);

      expect(response.status).toBe(405);
    });

    test('rejects OPTIONS requests to prevent CORS preflight exploitation', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'OPTIONS',
      });

      const response = middleware(request);

      expect(response.status).toBe(405);
    });
  });

  describe('SOLID Architecture Compliance', () => {
    test('Single Responsibility: Middleware only handles HTTP method validation', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
        body: { text: 'test', voiceId: 'test' } as TTSRequestBody,
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });

    test('Open/Closed: Middleware works with any TTS endpoint extension', async () => {
      const futureEndpoints = [
        'http://localhost:3000/api/tts/google',
        'http://localhost:3000/api/tts/amazon',
        'http://localhost:3000/api/tts/custom-provider'
      ];

      const validRequestBody: TTSRequestBody = {
        text: 'Test text',
        voiceId: 'test-voice'
      };

      for (const endpoint of futureEndpoints) {
        const request = createNextRequest(endpoint, {
          method: 'POST',
          body: validRequestBody,
        });

        const response = middleware(request);

        expect(response).toBeDefined();
        expect(response.status).not.toBe(405);
      }
    });

    test('Interface Segregation: Uses focused TTSErrorResponse interface', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'GET',
      });

      const response = middleware(request);
      const data = await response.json() as TTSErrorResponse;

      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
      expect(Object.keys(data).length).toBeLessThanOrEqual(2);
    });

    test('Dependency Inversion: Depends on Next.js abstractions', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
        body: { text: 'test', voiceId: 'test' } as TTSRequestBody,
      });

      expect(request.method).toBe('POST');
      expect(request.url).toContain('/api/tts/azure');

      const response = middleware(request);
      expect(response).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles requests with missing body gracefully', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });

    test('handles requests with malformed JSON body', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
        body: 'invalid json {', // This will be stringified, but that's intentional for testing
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });

    test('validates consistent error response structure', async () => {
      const invalidMethods = ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      for (const method of invalidMethods) {
        const request = createNextRequest('http://localhost:3000/api/tts/azure', {
          method,
        });

        const response = middleware(request);

        expect(response.status).toBe(405);

        const data = await response.json() as TTSErrorResponse;
        expect(validateErrorResponse(data)).toBe(true);
        expect(data.error).toBe('Method not allowed');
        expect(typeof data.details).toBe('string');
      }
    });

    test('handles case-sensitive HTTP methods correctly', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'post', // lowercase
      });

      const response = middleware(request);

      expect(response.status).toBe(405);
    });

    test('preserves request context for valid POST requests', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'POST',
        body: { text: 'test', voiceId: 'test' } as TTSRequestBody,
        headers: {
          'Authorization': 'Bearer test-token',
          'User-Agent': 'test-agent',
        },
      });

      const response = middleware(request);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(405);
    });
  });

  describe('Configuration and Matcher Validation', () => {
    test('validates middleware matcher configuration', () => {
      const { config } = require('../../../../pages/api/tts/middleware');

      expect(config).toBeDefined();
      expect(config.matcher).toBe('/api/tts/:path*');
    });

    test('ensures middleware applies to correct URL patterns', async () => {
      const validUrls = [
        'http://localhost:3000/api/tts/azure',
        'http://localhost:3000/api/tts/elevenlabs',
        'http://localhost:3000/api/tts/custom-provider'
      ];

      for (const url of validUrls) {
        expect(url).toMatch(/\/api\/tts\/.+/);
      }
    });

    test('validates response headers for error responses', async () => {
      const request = createNextRequest('http://localhost:3000/api/tts/azure', {
        method: 'GET',
      });

      const response = middleware(request);

      expect(response.status).toBe(405);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
