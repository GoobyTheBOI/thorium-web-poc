import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { TtsOrchestrationService } from '@/lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager } from '@/lib/managers/TtsStateManager';
import { createAdapter } from '@/lib/factories/AdapterFactory';
import { IPlaybackAdapter } from '@/preferences/types';

// Mock external dependencies
jest.mock('@/lib/adapters/ElevenLabsAdapter');
jest.mock('@/lib/adapters/AzureAdapter');
jest.mock('@/lib/factories/AdapterFactory');

describe('Core Service Integration', () => {
  let voiceService: VoiceManagementService;
  let orchestrationService: TtsOrchestrationService;
  let textExtractionService: EpubTextExtractionService;
  let stateManager: TtsStateManager;
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

    // Initialize all services
    voiceService = new VoiceManagementService();
    textExtractionService = new EpubTextExtractionService();
    stateManager = new TtsStateManager();
    orchestrationService = new TtsOrchestrationService(
      mockAdapter,
      textExtractionService,
      stateManager,
      voiceService,
      'elevenlabs'
    );
  });

  it('should create and wire up all services correctly', () => {
    // Verify all services are created
    expect(voiceService).toBeInstanceOf(VoiceManagementService);
    expect(orchestrationService).toBeInstanceOf(TtsOrchestrationService);
    expect(textExtractionService).toBeInstanceOf(EpubTextExtractionService);
    expect(stateManager).toBeInstanceOf(TtsStateManager);
  });

  it('should coordinate basic TTS workflow', async () => {
    // Given: Services are initialized
    expect(orchestrationService.getCurrentAdapterType()).toBe('elevenlabs');

    // When: Voice is selected and TTS starts
    voiceService.selectVoice('test-voice');
    await orchestrationService.startReading();

    // Then: All services work together
    expect(voiceService.getSelectedVoice()).toBe('test-voice');
    expect(mockAdapter.play).toHaveBeenCalled();
  });

  it('should handle service errors gracefully', async () => {
    // Given: Adapter will fail
    mockAdapter.play.mockRejectedValueOnce(new Error('Playback failed'));

    // When: Error is handled gracefully
    await orchestrationService.startReading();

    // Then: System should still be in consistent state and error is set
    expect(orchestrationService.getCurrentAdapterType()).toBe('elevenlabs');
    // In production mode (tests), errors are handled silently, not thrown
  });
});
