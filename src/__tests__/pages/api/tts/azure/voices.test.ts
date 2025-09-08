import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/tts/azure/voices';
import { VoiceInfo } from '@/preferences/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Sample Azure voice data for testing
const mockAzureVoices = [
  {
    ShortName: 'en-US-AriaNeural',
    LocalName: 'Aria',
    LocaleName: 'English (United States)',
    Locale: 'en-US',
    Gender: 'Female'
  },
  {
    ShortName: 'en-US-DavisNeural',
    LocalName: 'Davis',
    LocaleName: 'English (United States)',
    Locale: 'en-US',
    Gender: 'Male'
  },
  {
    ShortName: 'fr-FR-DeniseNeural',
    LocalName: 'Denise',
    LocaleName: 'French (France)',
    Locale: 'fr-FR',
    Gender: 'Female'
  }
];

const expectedVoices: VoiceInfo[] = [
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (English (United States))',
    language: 'en-US',
    gender: 'female'
  },
  {
    id: 'en-US-DavisNeural',
    name: 'Davis (English (United States))',
    language: 'en-US',
    gender: 'male'
  },
  {
    id: 'fr-FR-DeniseNeural',
    name: 'Denise (French (France))',
    language: 'fr-FR',
    gender: 'female'
  }
];

describe('/api/tts/azure/voices', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    mockFetch.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('HTTP Method Validation', () => {
    it('should return 405 for POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ error: 'Method not allowed' });
    });

    it('should return 405 for PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ error: 'Method not allowed' });
    });

    it('should return 405 for DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ error: 'Method not allowed' });
    });

    it('should return 405 for PATCH requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PATCH',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({ error: 'Method not allowed' });
    });
  });

  describe('Environment Configuration', () => {
    it('should return 500 when AZURE_API_KEY is missing', async () => {
      delete process.env.AZURE_API_KEY;
      process.env.AZURE_REGION = 'eastus';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Azure Speech API not configured'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Azure Speech credentials not configured');
    });

    it('should return 500 when AZURE_REGION is missing', async () => {
      process.env.AZURE_API_KEY = 'test-key';
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Azure Speech API not configured'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Azure Speech credentials not configured');
    });

    it('should return 500 when both AZURE_API_KEY and AZURE_REGION are missing', async () => {
      delete process.env.AZURE_API_KEY;
      delete process.env.AZURE_REGION;

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Azure Speech API not configured'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Azure Speech credentials not configured');
    });
  });

  describe('Successful Voice Fetching', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'eastus';
    });

    it('should successfully fetch and transform voices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAzureVoices,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual(expectedVoices);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://eastus.tts.speech.microsoft.com/cognitiveservices/voices/list',
        {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-api-key',
          },
        }
      );
    });

    it('should handle empty voices array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual([]);
    });

    it('should use correct Azure region in URL', async () => {
      process.env.AZURE_REGION = 'westeurope';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAzureVoices,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://westeurope.tts.speech.microsoft.com/cognitiveservices/voices/list',
        expect.any(Object)
      );
    });

    it('should properly transform voice data with gender case conversion', async () => {
      const voicesWithUppercaseGender = [
        {
          ShortName: 'test-voice',
          LocalName: 'Test Voice',
          LocaleName: 'Test Language',
          Locale: 'test-locale',
          Gender: 'FEMALE'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => voicesWithUppercaseGender,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data[0].gender).toBe('female');
    });

    it('should handle voices with neutral gender', async () => {
      const voicesWithNeutralGender = [
        {
          ShortName: 'test-neutral-voice',
          LocalName: 'Neutral Voice',
          LocaleName: 'Test Language',
          Locale: 'test-locale',
          Gender: 'Neutral'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => voicesWithNeutralGender,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data[0].gender).toBe('neutral');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'eastus';
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Azure Speech API error: 401 Unauthorized'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching Azure voices:',
        expect.any(Error)
      );
    });

    it('should handle 403 forbidden error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Azure Speech API error: 403 Forbidden'
      });
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Azure Speech API error: 500 Internal Server Error'
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Network error'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching Azure voices:',
        expect.any(Error)
      );
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Invalid JSON'
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Unknown error'
      });
    });

    it('should handle undefined error', async () => {
      mockFetch.mockRejectedValueOnce(undefined);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        error: 'Failed to fetch voices from Azure Speech Service',
        details: 'Unknown error'
      });
    });
  });

  describe('API Call Verification', () => {
    beforeEach(() => {
      process.env.AZURE_API_KEY = 'test-api-key';
      process.env.AZURE_REGION = 'eastus';
    });

    it('should make exactly one API call per request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAzureVoices,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include correct headers in API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAzureVoices,
      } as Response);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': 'test-api-key',
          },
        })
      );
    });
  });
});
