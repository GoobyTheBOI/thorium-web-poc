import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { VoiceInfo } from '@/preferences/types';
import { getVoices, IVoices } from 'readium-speech';

// Mock the readium-speech module
jest.mock('readium-speech', () => ({
  getVoices: jest.fn(),
}));

// Mock the error utils
jest.mock('@/lib/utils/errorUtils', () => ({
  createNetworkAwareError: jest.fn((error, provider) => {
    // Return a standard Error that matches our test expectations
    if (error instanceof Error && (
      error.message.includes('network') ||
      error.message.includes('Network') ||
      error.message.includes('API down') ||
      error.message.includes('API failure')
    )) {
      return new Error('No internet connection available');
    }
    return new Error(`Unable to generate audio with ${provider}`);
  }),
  extractErrorMessage: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('VoiceManagementService', () => {
  let service: VoiceManagementService;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  const mockElevenLabsVoices: VoiceInfo[] = [
    { id: 'elevenlabs1', name: 'Alice EL', language: 'en-US', gender: 'female' },
    { id: 'elevenlabs2', name: 'Bob EL', language: 'en-US', gender: 'male' },
  ];

  const mockAzureVoices: VoiceInfo[] = [
    { id: 'azure1', name: 'Charlie Azure', language: 'en-US', gender: 'male' },
    { id: 'azure2', name: 'Diana Azure', language: 'en-GB', gender: 'female' },
  ];

  const mockReadiumVoices: IVoices[] = [
    {
      name: 'Readium Voice 1',
      label: 'RV1',
      language: 'en-US',
      offlineAvailability: true,
      pitchControl: true,
      voiceURI: 'readium://voice1',
      age: 'adult',
      gender: 'female',
    },
    {
      name: 'Readium Voice 2',
      label: 'RV2',
      language: 'en-GB',
      offlineAvailability: false,
      pitchControl: false,
      voiceURI: 'readium://voice2',
      age: 'adult',
      gender: 'male',
    },
  ];

  beforeEach(() => {
    service = new VoiceManagementService();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Constructor', () => {
    it('should initialize with null selected voice and empty voice arrays', () => {
      expect(service.getSelectedVoice()).toBeNull();
    });
  });

  describe('loadRediumVoices', () => {
    it('should load Readium voices successfully', async () => {
      (getVoices as jest.Mock).mockResolvedValue(mockReadiumVoices);

      const result = await service.loadRediumVoices();

      expect(getVoices).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReadiumVoices.map(voice => ({
        name: voice.name,
        label: voice.label,
        language: voice.language,
        offlineAvailability: voice.offlineAvailability,
        pitchControl: voice.pitchControl,
        voiceURI: voice.voiceURI,
        age: voice.age,
        gender: voice.gender,
      })));
    });

    it('should handle errors when loading Readium voices', async () => {
      const error = new Error('Readium error');
      (getVoices as jest.Mock).mockRejectedValue(error);

      await expect(service.loadRediumVoices()).rejects.toThrow('Unable to generate audio with ElevenLabs');
    });
  });

  describe('loadElevenLabsVoices', () => {
    it('should load ElevenLabs voices successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.loadElevenLabsVoices();

      expect(fetch).toHaveBeenCalledWith('/api/tts/elevenlabs/voices');
      expect(result).toEqual(mockElevenLabsVoices);
    });

    it('should handle non-ok response from ElevenLabs API', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'API Error' }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.loadElevenLabsVoices()).rejects.toThrow('Unable to generate audio with ElevenLabs');
    });

    it('should handle network error when loading ElevenLabs voices', async () => {
      const error = new Error('Network error');
      (fetch as jest.Mock).mockRejectedValue(error);

      await expect(service.loadElevenLabsVoices()).rejects.toThrow('No internet connection available');
    });

    it('should handle non-ok response without specific error message', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.loadElevenLabsVoices()).rejects.toThrow('Unable to generate audio with ElevenLabs');
    });
  });

  describe('loadAzureVoices', () => {
    it('should load Azure voices successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.loadAzureVoices();

      expect(fetch).toHaveBeenCalledWith('/api/tts/azure/voices');
      expect(result).toEqual(mockAzureVoices);
    });

    it('should handle non-ok response from Azure API', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Azure API Error' }),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.loadAzureVoices()).rejects.toThrow('Unable to generate audio with Azure Speech');
    });

    it('should handle network error when loading Azure voices', async () => {
      const error = new Error('Azure network error');
      (fetch as jest.Mock).mockRejectedValue(error);

      await expect(service.loadAzureVoices()).rejects.toThrow('No internet connection available');
    });

    it('should handle non-ok response without specific error message', async () => {
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      };
      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.loadAzureVoices()).rejects.toThrow('Unable to generate audio with Azure Speech');
    });
  });

  describe('selectVoice', () => {
    it('should select a voice and log the selection', () => {
      service.selectVoice('test-voice-id');

      expect(service.getSelectedVoice()).toBe('test-voice-id');
    });

    it('should update selected voice when called multiple times', () => {
      service.selectVoice('voice1');
      service.selectVoice('voice2');
      expect(service.getSelectedVoice()).toBe('voice2');
    });
  });

  describe('getSelectedVoice', () => {
    it('should return null initially', () => {
      expect(service.getSelectedVoice()).toBeNull();
    });

    it('should return the selected voice ID', () => {
      service.selectVoice('selected-voice');
      expect(service.getSelectedVoice()).toBe('selected-voice');
    });
  });

  describe('getVoicesByGender', () => {
    it('should load and filter voices by gender (female)', async () => {
      // Mock ElevenLabs API
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      // Mock Azure API
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      const result = await service.getVoicesByGender('female');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith('/api/tts/elevenlabs/voices');
      expect(fetch).toHaveBeenCalledWith('/api/tts/azure/voices');

      const expectedFemaleVoices = [
        mockElevenLabsVoices[0], // Alice EL
        mockAzureVoices[1], // Diana Azure
      ];
      expect(result).toEqual(expectedFemaleVoices);
    });

    it('should load and filter voices by gender (male)', async () => {
      // Mock ElevenLabs API
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      // Mock Azure API
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      const result = await service.getVoicesByGender('male');

      const expectedMaleVoices = [
        mockElevenLabsVoices[1], // Bob EL
        mockAzureVoices[0], // Charlie Azure
      ];
      expect(result).toEqual(expectedMaleVoices);
    });

    it('should not reload voices if already loaded', async () => {
      // First load
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      await service.getVoicesByGender('female');
      expect(fetch).toHaveBeenCalledTimes(2);

      // Reset fetch mock
      jest.clearAllMocks();

      // Second call should not trigger new API calls
      const result = await service.getVoicesByGender('male');
      expect(fetch).not.toHaveBeenCalled();

      const expectedMaleVoices = [
        mockElevenLabsVoices[1], // Bob EL
        mockAzureVoices[0], // Charlie Azure
      ];
      expect(result).toEqual(expectedMaleVoices);
    });

    it('should handle partial loading failure gracefully', async () => {
      // ElevenLabs succeeds, Azure fails
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockRejectedValueOnce(new Error('Azure API down'));

      await expect(service.getVoicesByGender('female')).rejects.toThrow('No internet connection available');
    });
  });

  describe('getCurrentVoiceGender', () => {
    it('should return null when no voice is selected', async () => {
      const result = await service.getCurrentVoiceGender();
      expect(result).toBeNull();
    });

    it('should return gender of selected ElevenLabs voice', async () => {
      // Load voices first
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      service.selectVoice('elevenlabs1'); // Alice EL (female)
      const result = await service.getCurrentVoiceGender();

      expect(result).toBe('female');
    });

    it('should return gender of selected Azure voice', async () => {
      // Load voices first
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      service.selectVoice('azure1'); // Charlie Azure (male)
      const result = await service.getCurrentVoiceGender();

      expect(result).toBe('male');
    });

    it('should return null for unknown voice ID', async () => {
      // Load voices first
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      service.selectVoice('unknown-voice-id');
      const result = await service.getCurrentVoiceGender();

      expect(result).toBeNull();
    });

    it('should not reload voices if already loaded', async () => {
      // First load through getCurrentVoiceGender
      const mockElevenLabsResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ voices: mockElevenLabsVoices }),
      };
      const mockAzureResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockAzureVoices),
      };
      (fetch as jest.Mock)
        .mockResolvedValueOnce(mockElevenLabsResponse)
        .mockResolvedValueOnce(mockAzureResponse);

      service.selectVoice('elevenlabs2'); // Bob EL (male)
      await service.getCurrentVoiceGender();
      expect(fetch).toHaveBeenCalledTimes(2);

      // Reset fetch mock
      jest.clearAllMocks();

      // Second call should not trigger new API calls
      const result = await service.getCurrentVoiceGender();
      expect(fetch).not.toHaveBeenCalled();
      expect(result).toBe('male');
    });

    it('should handle loading failures gracefully', async () => {
      service.selectVoice('test-voice');

      // Mock API failure
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('API failure'));

      await expect(service.getCurrentVoiceGender()).rejects.toThrow('No internet connection available');
    });
  });
});
