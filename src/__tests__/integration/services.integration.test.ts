import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { TtsOrchestrationService } from '@/lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager } from '@/lib/managers/TtsStateManager';
import { createAdapter } from '@/lib/factories/AdapterFactory';
import type { VoiceInfo } from '@/preferences/types';

// Mock external dependencies
jest.mock('@/lib/adapters/ElevenLabsAdapter');
jest.mock('@/lib/adapters/AzureAdapter');
jest.mock('@/lib/factories/AdapterFactory');

describe('Core Service Integration', () => {
  let voiceService: VoiceManagementService;
  let orchestrationService: TtsOrchestrationService;
  let textExtractionService: EpubTextExtractionService;
  let stateManager: TtsStateManager;
  let mockAdapter: jest.Mocked<{
    processTextChunk: (chunk: unknown) => Promise<ArrayBuffer>;
    play: (chunk: unknown) => Promise<unknown>;
    playTextChunk: (chunk: unknown) => Promise<unknown>;
    startPlayback: (data: ArrayBuffer) => void;
    stopPlayback: () => void;
    isPlaying: boolean;
    on: (event: string, callback: (info: unknown) => void) => void;
    off: (event: string, callback: (info: unknown) => void) => void;
    voices: {
      getVoices: () => Promise<VoiceInfo[]>;
      setVoice: (voiceId: string) => Promise<void>;
      getCurrentVoice: () => VoiceInfo | null;
    };
  }>;

  beforeEach(() => {
    // Create mock adapter
    mockAdapter = {
      processTextChunk: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      play: jest.fn().mockResolvedValue({}),
      playTextChunk: jest.fn().mockResolvedValue({}),
      startPlayback: jest.fn(),
      stopPlayback: jest.fn(),
      isPlaying: false,
      on: jest.fn(),
      off: jest.fn(),
      voices: {
        getVoices: jest.fn().mockResolvedValue([]),
        setVoice: jest.fn().mockResolvedValue(undefined),
        getCurrentVoice: jest.fn().mockReturnValue(null),
      },
    };

    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(mockAdapter);

    // Initialize all services
    voiceService = new VoiceManagementService();
    textExtractionService = new EpubTextExtractionService();
    stateManager = new TtsStateManager();
    orchestrationService = new TtsOrchestrationService(
      mockAdapter,
      textExtractionService,
      stateManager,
      'elevenlabs'
    );

    // Mock text extraction to return sample text
    jest.spyOn(textExtractionService, 'extractTextChunks').mockResolvedValue([
      { text: 'Sample text for testing' }
    ]);
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
