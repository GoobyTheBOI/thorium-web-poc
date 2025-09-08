import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { TtsOrchestrationService } from '@/lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager } from '@/lib/managers/TtsStateManager';
import { createAdapter } from '@/lib/factories/AdapterFactory';
import { IPlaybackAdapter } from '@/preferences/types';

jest.mock('@/lib/adapters/ElevenLabsAdapter');
jest.mock('@/lib/adapters/AzureAdapter');
jest.mock('@/lib/factories/AdapterFactory');

describe('Voice and Orchestration Integration', () => {
  let voiceService: VoiceManagementService;
  let orchestrationService: TtsOrchestrationService;
  let mockAdapter: jest.Mocked<IPlaybackAdapter>;

  beforeEach(() => {
    // Create mock adapter
    mockAdapter = {
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      resume: jest.fn(),
      destroy: jest.fn(),
      getIsPlaying: jest.fn().mockReturnValue(false),
      getIsPaused: jest.fn().mockReturnValue(false),
      on: jest.fn(),
      off: jest.fn(),
      voices: {
        getVoices: jest.fn(),
        setVoice: jest.fn(),
        getCurrentVoice: jest.fn(),
      },
    } as jest.Mocked<IPlaybackAdapter>;

    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(mockAdapter);

    // Initialize services
    voiceService = new VoiceManagementService();
    const textService = new EpubTextExtractionService();
    const stateManager = new TtsStateManager();

    orchestrationService = new TtsOrchestrationService(
      mockAdapter,
      textService,
      stateManager,
      voiceService,
      'elevenlabs'
    );
  });

  it('should coordinate voice selection with TTS playback', async () => {
    // Given: A voice is selected
    voiceService.selectVoice('test-voice-id');

    // When: TTS starts reading
    await orchestrationService.startReading();

    // Then: Voice selection is maintained and playback begins
    expect(voiceService.getSelectedVoice()).toBe('test-voice-id');
    expect(mockAdapter.play).toHaveBeenCalled();
  });

  it('should maintain playback state consistency', async () => {
    // Given: Initial stopped state
    expect(orchestrationService.isPlaying()).toBe(false);

    // When: Start playing
    (mockAdapter.getIsPlaying as jest.Mock).mockReturnValue(true);
    await orchestrationService.startReading();

    // Then: State reflects playing
    expect(orchestrationService.isPlaying()).toBe(true);

    // When: Pause
    (mockAdapter.getIsPlaying as jest.Mock).mockReturnValue(false);
    (mockAdapter.getIsPaused as jest.Mock).mockReturnValue(true);
    orchestrationService.pauseReading();

    // Then: State reflects paused
    expect(orchestrationService.isPaused()).toBe(true);
  });

  it('should handle adapter type switching', () => {
    // Given: Initial adapter type
    expect(orchestrationService.getCurrentAdapterType()).toBe('elevenlabs');

    // This test would expand when adapter switching is implemented
    // For now, just verify the type is correctly maintained
  });
});
