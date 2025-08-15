import { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../../../pages/api/tts/azure';

// Mock the Azure SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const mockSpeechConfig = {
    speechSynthesisVoiceName: '',
    speechSynthesisOutputFormat: null
  };

  const mockSynthesizer = {
    speakSsmlAsync: jest.fn(),
    close: jest.fn()
  };

  return {
    SpeechConfig: {
      fromSubscription: jest.fn().mockReturnValue(mockSpeechConfig)
    },
    AudioConfig: {
      fromDefaultSpeakerOutput: jest.fn()
    },
    SpeechSynthesizer: jest.fn().mockImplementation(() => mockSynthesizer),
    ResultReason: {
      SynthesizingAudioCompleted: 'SynthesizingAudioCompleted',
      Canceled: 'Canceled'
    },
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 'Audio16Khz32KBitRateMonoMp3'
    }
  };
});

describe('/api/tts/azure - Simple API Tests', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;

  beforeEach(() => {
    req = {
      method: 'POST',
      body: {
        text: 'Hello world',
        voiceId: 'en-US-AriaNeural'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    // Set environment variables for tests
    process.env.AZURE_SPEECH_KEY = 'test-azure-key';
    process.env.AZURE_SPEECH_REGION = 'test-region';
    process.env.AZURE_VOICE_NAME = 'en-US-AriaNeural';

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;
    delete process.env.AZURE_VOICE_NAME;
  });

  test('returns error when text is missing', async () => {
    req.body = { voiceId: 'en-US-AriaNeural' }; // Missing text

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields',
      details: 'text is required'
    });
  });

  test('returns error when Azure credentials are missing', async () => {
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Azure Speech API not configured',
      details: 'Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in your environment variables'
    });
  });

  test('processes request with valid Azure credentials', async () => {
    // Get the mocked objects
    const { SpeechSynthesizer } = require('microsoft-cognitiveservices-speech-sdk');
    const mockSynthesizerInstance = SpeechSynthesizer.mock.results[0]?.value || {
      speakSsmlAsync: jest.fn(),
      close: jest.fn()
    };

    // Mock successful synthesis
    mockSynthesizerInstance.speakSsmlAsync.mockImplementation((ssml: any, callback: any) => {
      const mockResult = {
        reason: 'SynthesizingAudioCompleted',
        audioData: new ArrayBuffer(100)
      };
      callback(mockResult);
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockSynthesizerInstance.speakSsmlAsync).toHaveBeenCalled();
    expect(mockSynthesizerInstance.close).toHaveBeenCalled();
  });

  test('handles Azure Speech synthesis errors', async () => {
    // Mock synthesis error
    mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, callback, errorCallback) => {
      errorCallback(new Error('Azure synthesis failed'));
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate audio with Azure Speech',
      details: expect.any(String)
    });
    expect(mockSynthesizer.close).toHaveBeenCalled();
  });

  test('handles canceled synthesis result', async () => {
    // Mock canceled synthesis
    mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, callback) => {
      const mockResult = {
        reason: 'Canceled',
        errorDetails: 'Synthesis was canceled'
      };
      callback(mockResult);
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate audio with Azure Speech',
      details: expect.stringContaining('Synthesis was canceled')
    });
    expect(mockSynthesizer.close).toHaveBeenCalled();
  });

  test('uses default voice when voiceId not provided', async () => {
    req.body = { text: 'Hello world' }; // No voiceId

    mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, callback) => {
      const mockResult = {
        reason: 'SynthesizingAudioCompleted',
        audioData: new ArrayBuffer(100)
      };
      callback(mockResult);
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockSpeechConfig.speechSynthesisVoiceName).toBe('en-US-AriaNeural');
  });

  test('cleans up synthesizer on successful completion', async () => {
    mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, callback) => {
      const mockResult = {
        reason: 'SynthesizingAudioCompleted',
        audioData: new ArrayBuffer(100)
      };
      callback(mockResult);
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(mockSynthesizer.close).toHaveBeenCalled();
  });

  test('handles unexpected errors gracefully', async () => {
    // Mock unexpected error
    mockSynthesizer.speakSsmlAsync.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate audio with Azure Speech',
      details: expect.any(String)
    });
  });
});
