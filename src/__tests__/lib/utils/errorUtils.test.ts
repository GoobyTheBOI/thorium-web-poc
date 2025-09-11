import {
  isNetworkError,
  createError,
  extractErrorMessage,
  createNetworkAwareError,
  handleDevelopmentError
} from '@/lib/utils/errorUtils';
import { ITTSError } from '@/preferences/types';

// Mock process.env
const mockEnv = (env: string) => {
  const originalEnv = process.env.NODE_ENV;
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    configurable: true
  });
  return () => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      configurable: true
    });
  };
};

describe('errorUtils', () => {
  describe('isNetworkError', () => {
    it('should identify network errors by message content', () => {
      const networkErrors = [
        new Error('Network error occurred'),
        new Error('Failed to fetch'),
        new Error('Connection timeout'),
        new Error('No internet connection'),
        new Error('Offline mode detected'),
      ];

      networkErrors.forEach(error => {
        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should identify network errors by error name', () => {
      const networkError = new Error('Something went wrong');
      networkError.name = 'NetworkError';
      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should identify TypeError as network error', () => {
      const typeError = new TypeError('Failed to fetch');
      expect(isNetworkError(typeError)).toBe(true);
    });

    it('should identify pure TypeError as network error', () => {
      const typeError = new TypeError('Random type error');
      expect(isNetworkError(typeError)).toBe(false); // TypeErrors are not always network errors
    });

    it('should not identify non-network errors', () => {
      const nonNetworkErrors = [
        new Error('Validation failed'),
        new Error('Invalid input'),
        new ReferenceError('Variable not defined'),
        new SyntaxError('Invalid syntax'),
      ];

      nonNetworkErrors.forEach(error => {
        expect(isNetworkError(error)).toBe(false);
      });
    });

    it('should handle non-Error objects', () => {
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
      expect(isNetworkError({})).toBe(false);
      expect(isNetworkError(123)).toBe(false);
    });

    it('should be case insensitive for error messages', () => {
      const errors = [
        new Error('NETWORK ERROR'),
        new Error('Failed To Fetch'),
        new Error('CONNECTION TIMEOUT'),
      ];

      errors.forEach(error => {
        expect(isNetworkError(error)).toBe(true);
      });
    });
  });

  describe('createError', () => {
    it('should create ITTSError with required fields', () => {
      const error = createError('TEST_CODE', 'Test message');

      expect(error).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        details: undefined
      });
    });

    it('should include details in development environment', () => {
      const restoreEnv = mockEnv('development');

      const details = { additional: 'info' };
      const error = createError('TEST_CODE', 'Test message', details);

      expect(error).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        details: details
      });

      restoreEnv();
    });

    it('should exclude details in production environment', () => {
      const restoreEnv = mockEnv('production');

      const details = { additional: 'info' };
      const error = createError('TEST_CODE', 'Test message', details);

      expect(error).toEqual({
        code: 'TEST_CODE',
        message: 'Test message',
        details: undefined
      });

      restoreEnv();
    });

    it('should handle different detail types', () => {
      const restoreEnv = mockEnv('development');

      const stringDetails = 'string details';
      const objectDetails = { key: 'value' };
      const numberDetails = 42;

      expect(createError('CODE', 'Message', stringDetails).details).toBe(stringDetails);
      expect(createError('CODE', 'Message', objectDetails).details).toBe(objectDetails);
      expect(createError('CODE', 'Message', numberDetails).details).toBe(numberDetails);

      restoreEnv();
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return string errors as-is', () => {
      expect(extractErrorMessage('String error')).toBe('String error');
    });

    it('should extract message from objects with message property', () => {
      const errorObj = { message: 'Object error message' };
      expect(extractErrorMessage(errorObj)).toBe('Object error message');
    });

    it('should return fallback message for unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('Unknown error occurred');
      expect(extractErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(extractErrorMessage({})).toBe('Unknown error occurred');
      expect(extractErrorMessage(123)).toBe('Unknown error occurred');
    });

    it('should use custom fallback message', () => {
      const customFallback = 'Custom fallback message';
      expect(extractErrorMessage(null, customFallback)).toBe(customFallback);
      expect(extractErrorMessage({}, customFallback)).toBe(customFallback);
    });

    it('should handle objects with non-string message property', () => {
      expect(extractErrorMessage({ message: 123 })).toBe('Unknown error occurred');
      expect(extractErrorMessage({ message: null })).toBe('Unknown error occurred');
      expect(extractErrorMessage({ message: {} })).toBe('Unknown error occurred');
    });
  });

  describe('createNetworkAwareError', () => {
    it('should create network error for network-related errors', () => {
      const networkError = new Error('Network connection failed');
      const result = createNetworkAwareError(networkError, 'ElevenLabs');

      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toContain('Geen internetverbinding beschikbaar');
    });

    it('should create API auth error for 401 errors', () => {
      const authError = new Error('API Error: 401 Unauthorized');
      const result = createNetworkAwareError(authError, 'ElevenLabs');

      expect(result.code).toBe('API_AUTH_ERROR');
      expect(result.message).toContain('Ongeldige API-sleutel voor ElevenLabs');
    });

    it('should create API error for other API errors', () => {
      const apiError = new Error('API Error: 500 Internal Server Error');
      const result = createNetworkAwareError(apiError, 'Azure Speech');

      expect(result.code).toBe('API_ERROR');
      expect(result.message).toContain('Azure Speech API fout');
      expect(result.message).toContain('500 Internal Server Error');
    });

    it('should create default playback error for unknown errors', () => {
      const unknownError = new Error('Random error');
      const result = createNetworkAwareError(unknownError, 'ElevenLabs');

      expect(result.code).toBe('PLAYBACK_FAILED');
      expect(result.message).toContain('Kan geen audio genereren met ElevenLabs');
    });

    it('should handle Azure Speech provider correctly', () => {
      const unknownError = new Error('Random error');
      const result = createNetworkAwareError(unknownError, 'Azure Speech');

      expect(result.code).toBe('PLAYBACK_FAILED');
      expect(result.message).toContain('Kan geen audio genereren met Azure Speech');
    });

    it('should handle non-Error inputs', () => {
      const stringError = 'String error';
      const result = createNetworkAwareError(stringError, 'ElevenLabs');

      expect(result.code).toBe('PLAYBACK_FAILED');
      expect(result.message).toContain('Kan geen audio genereren met ElevenLabs');
    });

    it('should include details in development mode', () => {
      const restoreEnv = mockEnv('development');

      const error = new Error('Test error');
      const result = createNetworkAwareError(error, 'ElevenLabs');

      expect(result.details).toBe(error);

      restoreEnv();
    });
  });

  describe('handleDevelopmentError', () => {
    it('should throw error in development mode', () => {
      const restoreEnv = mockEnv('development');

      const error = new Error('Test error');
      expect(() => {
        handleDevelopmentError(error, 'TestContext');
      }).toThrow('TestContext: Test error');

      restoreEnv();
    });

    it('should not throw error in production mode', () => {
      const restoreEnv = mockEnv('production');

      const error = new Error('Test error');
      expect(() => {
        handleDevelopmentError(error, 'TestContext');
      }).not.toThrow();

      restoreEnv();
    });

    it('should handle different error types in development', () => {
      const restoreEnv = mockEnv('development');

      expect(() => {
        handleDevelopmentError('String error', 'TestContext');
      }).toThrow('TestContext: String error');

      expect(() => {
        handleDevelopmentError(null, 'TestContext');
      }).toThrow('TestContext: Error in TestContext');

      restoreEnv();
    });

    it('should handle different error types in production', () => {
      const restoreEnv = mockEnv('production');

      expect(() => {
        handleDevelopmentError('String error', 'TestContext');
      }).not.toThrow();

      expect(() => {
        handleDevelopmentError(null, 'TestContext');
      }).not.toThrow();

      restoreEnv();
    });
  });
});
