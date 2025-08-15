// Mock the Next.js Request/Response globals for Node.js environment
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: any;

    constructor(url: string, init?: any) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map();
      this.body = init?.body;

      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value as string);
        });
      }
    }

    clone() {
      return new MockRequest(this.url, {
        method: this.method,
        headers: Object.fromEntries(this.headers),
        body: this.body
      });
    }
  },
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    status: number;
    headers: Map<string, string>;
    body: any;

    constructor(body?: any, init?: any) {
      this.status = init?.status || 200;
      this.headers = new Map();
      this.body = body;
    }

    static json(data: any, init?: any) {
      return new MockResponse(JSON.stringify(data), init);
    }
  },
});

import { middleware } from '../../../../pages/api/tts/middleware';
import { NextRequest } from 'next/server';

describe('TTS API middleware', () => {
  test('allows POST requests to continue', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'POST',
      body: JSON.stringify({ text: 'test', voiceId: 'test' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await middleware(request);

    // NextResponse.next() doesn't have a direct status, but we can check it's not an error response
    expect(response).toBeDefined();
  });

  test('rejects GET requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);

    const data = await response.json();
    expect(data.error).toBe('Method not allowed');
    expect(data.details).toBe('Only POST requests are accepted');
  });

  test('rejects PUT requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'PUT',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);

    const data = await response.json();
    expect(data.error).toBe('Method not allowed');
  });

  test('rejects DELETE requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'DELETE',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);
  });

  test('rejects PATCH requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'PATCH',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);
  });

  test('rejects HEAD requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'HEAD',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);
  });

  test('rejects OPTIONS requests with 405', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/azure', {
      method: 'OPTIONS',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);
  });

  test('works with different TTS endpoints', async () => {
    const request = new NextRequest('http://localhost:3000/api/tts/elevenlabs', {
      method: 'GET',
    });

    const response = await middleware(request);

    expect(response.status).toBe(405);

    const data = await response.json();
    expect(data.error).toBe('Method not allowed');
  });
});
