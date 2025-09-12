import { VoiceManagementService } from '@/lib/services/VoiceManagementService';

// Mock error utilities
jest.mock('@/lib/utils/errorUtils', () => ({
  createNetworkAwareError: jest.fn((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const newError = new Error(errorMessage);
    newError.name = 'NetworkAwareError';
    return newError;
  }),
  isNetworkError: jest.fn(),
  isDevelopment: jest.fn(() => false),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Voice API Integration', () => {
  let voiceService: VoiceManagementService;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    voiceService = new VoiceManagementService();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('ElevenLabs Voice Loading', () => {
    it('should fetch and transform ElevenLabs voices correctly', async () => {
      // Given: Mock API response
      const mockResponse = {
        voices: [
          {
            voiceId: 'voice-el-1',
            name: 'Rachel',
            labels: { language: 'en', gender: 'female' }
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // When: Loading voices
      const voices = await voiceService.loadElevenLabsVoices();

      // Then: API called correctly and voices transformed
      expect(mockFetch).toHaveBeenCalledWith('/api/tts/elevenlabs/voices');
      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        voiceId: 'voice-el-1',
        name: 'Rachel',
        labels: { language: 'en', gender: 'female' }
      });
    });

    it('should handle ElevenLabs API errors gracefully', async () => {
      // Given: API returns error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // When/Then: Error is propagated
      await expect(voiceService.loadElevenLabsVoices()).rejects.toThrow('Network error');
    });
  });

  describe('Azure Voice Loading', () => {
    it('should fetch and transform Azure voices correctly', async () => {
      // Given: Mock Azure API response
      const mockResponse = [
        {
          ShortName: 'en-US-AriaNeural',
          LocalName: 'Aria',
          LocaleName: 'English (United States)',
          Locale: 'en-US',
          Gender: 'Female'
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // When: Loading voices
      const voices = await voiceService.loadAzureVoices();

      // Then: API called correctly and voices returned
      expect(mockFetch).toHaveBeenCalledWith('/api/tts/azure/voices');
      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        ShortName: 'en-US-AriaNeural',
        LocalName: 'Aria',
        LocaleName: 'English (United States)',
        Locale: 'en-US',
        Gender: 'Female'
      });
    });

    it('should handle Azure API errors gracefully', async () => {
      // Given: API returns error
      mockFetch.mockRejectedValueOnce(new Error('Azure API error'));

      // When/Then: Error is propagated
      await expect(voiceService.loadAzureVoices()).rejects.toThrow('Azure API error');
    });
  });

  describe('Voice Selection', () => {
    it('should manage voice selection state', () => {
      // Given: No voice initially selected
      expect(voiceService.getSelectedVoice()).toBeNull();

      // When: Selecting a voice
      voiceService.selectVoice('test-voice-id');

      // Then: Voice is selected
      expect(voiceService.getSelectedVoice()).toBe('test-voice-id');
    });

    it('should allow changing voice selection', () => {
      // Given: A voice is already selected
      voiceService.selectVoice('first-voice');
      expect(voiceService.getSelectedVoice()).toBe('first-voice');

      // When: Selecting a different voice
      voiceService.selectVoice('second-voice');

      // Then: Selection is updated
      expect(voiceService.getSelectedVoice()).toBe('second-voice');
    });
  });
});
