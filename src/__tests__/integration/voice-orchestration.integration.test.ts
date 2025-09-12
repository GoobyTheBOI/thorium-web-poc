import { VoiceManagementService } from '@/lib/services/VoiceManagementService';
import { TtsOrchestrationService } from '@/lib/services/TtsOrchestrationService';
import { EpubTextExtractionService } from '@/lib/services/TextExtractionService';
import { TtsStateManager } from '@/lib/managers/TtsStateManager';
import { createAdapter } from '@/lib/factories/AdapterFactory';
import type { VoiceInfo, PlaybackEventType } from '@/preferences/types';

jest.mock('@/lib/adapters/ElevenLabsAdapter');
jest.mock('@/lib/adapters/AzureAdapter');
jest.mock('@/lib/factories/AdapterFactory');
jest.mock('@/lib/services/TextExtractionService');

describe('Voice and Orchestration Integration', () => {
  let voiceService: VoiceManagementService;
  let orchestrationService: TtsOrchestrationService;
  let mockAdapter: jest.Mocked<{
    processTextChunk: (chunk: unknown) => Promise<ArrayBuffer>;
    play: (chunk: unknown) => Promise<unknown>;
    pause: () => Promise<unknown>;
    playTextChunk: (chunk: unknown) => Promise<unknown>;
    startPlayback: (data: ArrayBuffer) => void;
    stopPlayback: () => void;
    isPlaying: boolean;
    on: (event: PlaybackEventType, callback: (info: unknown) => void) => void;
    off: (event: PlaybackEventType, callback: (info: unknown) => void) => void;
    voices: {
      getVoices: () => Promise<VoiceInfo[]>;
      setVoice: (voiceId: string) => Promise<void>;
      getCurrentVoice: () => VoiceInfo | null;
    };
  }>;

  beforeEach(() => {
    // Create event listeners storage for the mock adapter
    const eventListeners: Record<string, ((info: unknown) => void)[]> = {};

    // Create mock adapter
    mockAdapter = {
      processTextChunk: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      play: jest.fn().mockResolvedValue({}),
      pause: jest.fn().mockResolvedValue({}),
      playTextChunk: jest.fn().mockResolvedValue({}),
      startPlayback: jest.fn(),
      stopPlayback: jest.fn(),
      isPlaying: false,
      on: jest.fn((event: PlaybackEventType, callback: (info: unknown) => void) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(callback);
      }),
      off: jest.fn(),
      voices: {
        getVoices: jest.fn().mockResolvedValue([]),
        setVoice: jest.fn().mockResolvedValue(undefined),
        getCurrentVoice: jest.fn().mockReturnValue(null),
      },
    };

    (createAdapter as jest.MockedFunction<typeof createAdapter>).mockReturnValue(mockAdapter);

    // Initialize services
    voiceService = new VoiceManagementService();
    const textService = new EpubTextExtractionService();
    const stateManager = new TtsStateManager();

    // Mock the extractTextChunks method to return sample text
    jest.spyOn(textService, 'extractTextChunks').mockResolvedValue([
      { text: 'Sample text for testing' }
    ]);

    orchestrationService = new TtsOrchestrationService(
      mockAdapter,
      textService,
      stateManager,
      'elevenlabs'
    );
  });

  it('should coordinate voice selection with TTS playback', async () => {
    // Given: A voice is selected
    voiceService.selectVoice('test-voice-id');

    // When: TTS starts reading
    await orchestrationService.startReading();

        // Then: Voice is selected and adapter play is called
    expect(voiceService.getSelectedVoice()).toBe('test-voice-id');
    expect(mockAdapter.play).toHaveBeenCalled();
  });

  it('should maintain playback state consistency', async () => {
    // Given: Initial stopped state
    expect(orchestrationService.isPlaying()).toBe(false);

    // When: Start playing
    await orchestrationService.startReading();

    // Verify that the adapter's play method was called
    expect(mockAdapter.play).toHaveBeenCalled();

    // Manually trigger the play event since our mock might not be working as expected
    const onSpy = mockAdapter.on;
    const playCallback = onSpy.mock.calls.find((call: unknown[]) => call[0] === 'play')?.[1];
    if (playCallback) {
      (playCallback as (...args: unknown[]) => void)({});
    }

    // Then: State reflects playing
    expect(orchestrationService.isPlaying()).toBe(true);

    // When: Pause
    orchestrationService.pauseReading();

    // Manually trigger the pause event
    const pauseCallback = onSpy.mock.calls.find((call: unknown[]) => call[0] === 'pause')?.[1];
    if (pauseCallback) {
      (pauseCallback as (...args: unknown[]) => void)({});
    }

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
