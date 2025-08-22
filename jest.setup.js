// Jest setup file for TTS testing environment
require('@testing-library/jest-dom');

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  }),
}));

// Mock Web APIs for TTS testing
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => []),
  },
});

// Mock Audio API for audio playback testing
Object.defineProperty(window, 'Audio', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentTime: 0,
    duration: 0,
    paused: true,
  })),
});

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock URL APIs for blob handling
global.URL = {
  createObjectURL: jest.fn(() => 'blob:fake-url'),
  revokeObjectURL: jest.fn()
};

// Polyfill Web APIs for Next.js middleware testing
const { ReadableStream } = require('stream/web');
const { TextDecoder, TextEncoder } = require('util');
const { Blob } = require('buffer');

// Mock Request and Response for Next.js compatibility
class MockRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.init = init;
  }
  get method() { return this.init.method || 'GET'; }
  get headers() { return this.init.headers || {}; }
  get body() { return this.init.body; }
  json() { return Promise.resolve(JSON.parse(this.init.body || '{}')); }
  text() { return Promise.resolve(this.init.body || ''); }
}

class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.init = init;
  }
  get status() { return this.init.status || 200; }
  get headers() { return this.init.headers || new Map(); }
  json() { return Promise.resolve(this.body); }
  text() { return Promise.resolve(this.body); }
}

// Setup Web API globals
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.Blob === 'undefined') {
  global.Blob = Blob;
}
if (typeof global.Request === 'undefined') {
  global.Request = MockRequest;
}
if (typeof global.Response === 'undefined') {
  global.Response = MockResponse;
}

// Mock NextResponse for middleware testing
class MockNextResponse extends MockResponse {
  static json(data, init = {}) {
    return new MockNextResponse(data, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    });
  }
}

if (typeof global.NextResponse === 'undefined') {
  global.NextResponse = MockNextResponse;
}

// Mock console to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test environment variables
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';
process.env.AZURE_API_KEY = 'test-azure-key';
process.env.AZURE_SPEECH_REGION = 'test-region';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
