import { TTSAdapterFactory } from '../lib/AdapterFactory';
import { VoiceManagementService } from '../lib/services/VoiceManagementService';
import { EpubTextExtractionService } from '../lib/services/TextExtractionService';
import { KeyboardHandler } from '../lib/handlers/KeyboardHandler';
import { TtsStateManager } from '../lib/managers/TtsStateManager';

describe('SOLID TTS Architecture - Basic Tests', () => {
  test('State Manager manages state correctly', () => {
    const stateManager = new TtsStateManager();

    expect(stateManager.getState()).toEqual({
      isPlaying: false,
      isPaused: false,
      isGenerating: false,
      error: null,
      currentAdapter: null
    });

    stateManager.setPlaying(true);
    expect(stateManager.getState().isPlaying).toBe(true);
  });

  test('Keyboard Handler handles shortcuts', () => {
    const handler = new KeyboardHandler();
    const mockAction = jest.fn();

    handler.register([{
      key: 'space',
      action: mockAction,
      description: 'Test shortcut'
    }]);

    expect(handler.getShortcuts()).toHaveLength(1);
    handler.cleanup();
  });

  test('TTS Adapter Factory creates adapters', () => {
    const factory = new TTSAdapterFactory();

    expect(() => factory.createAdapter('elevenlabs')).not.toThrow();
    expect(() => factory.createAdapter('azure')).not.toThrow();
  });

  test('Voice Management Service exists', () => {
    const voiceService = new VoiceManagementService();
    expect(voiceService).toBeDefined();
  });

  test('Text Extraction Service exists', () => {
    const textService = new EpubTextExtractionService();
    expect(textService).toBeDefined();
  });

  test('Available adapters can be retrieved', () => {
    const adapters = TTSAdapterFactory.getAvailableAdapters();
    expect(adapters.length).toBeGreaterThan(0);

    const implemented = TTSAdapterFactory.getImplementedAdapters();
    expect(implemented.length).toBeGreaterThan(0);
  });
});
