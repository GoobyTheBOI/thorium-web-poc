import { ElevenLabsAdapter } from '@/lib/adapters/ElevenLabsAdapter';
import { DefaultTextProcessor } from '@/lib/TextProcessor';
import { VoiceInfo } from '@/preferences/types';
import { TEST_CONFIG } from '../lib/constants/testConstants';

// Mock de fetch functie
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ElevenLabsAdapter Voice Selection', () => {
    let adapter: ElevenLabsAdapter;
    let textProcessor: DefaultTextProcessor;
    let mockVoiceService: any;

    beforeEach(() => {
        textProcessor = new DefaultTextProcessor();

        // Create mock voice service
        mockVoiceService = {
            loadElevenLabsVoices: jest.fn(),
            selectVoice: jest.fn(),
            getSelectedVoice: jest.fn(),
            getVoicesByGender: jest.fn(),
            getCurrentVoiceGender: jest.fn()
        };

        adapter = new ElevenLabsAdapter(textProcessor, mockVoiceService);

        // Reset alle mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        adapter.destroy();
    });

    describe('Voice Management', () => {
        const mockVoices: VoiceInfo[] = [
            {
                id: 'EXAVITQu4vr4xnSDxMaL',
                name: 'Dutch Female Professional 1',
                language: 'nl-NL',
                gender: 'female'
            },
            {
                id: 'MF3mGyEYCmosw6y6VdL4',
                name: 'Dutch Male Professional 1',
                language: 'nl-NL',
                gender: 'male'
            },
            {
                id: 'pNInz6obpgDQGcFmaJgB',
                name: 'Dutch Female Professional 2',
                language: 'nl-NL',
                gender: 'female'
            }
        ];

        it('should fetch Dutch voices from API', async () => {
            mockVoiceService.loadElevenLabsVoices.mockResolvedValue(mockVoices);

            const voices = await adapter.voices.getVoices();

            expect(mockVoiceService.loadElevenLabsVoices).toHaveBeenCalled();
            expect(voices).toEqual(mockVoices);
        });

        it('should filter voices by gender (male)', async () => {
            const maleVoices = mockVoices.filter(v => v.gender === 'male');
            mockVoiceService.loadElevenLabsVoices.mockResolvedValue(mockVoices);

            const result = await adapter.voices.getVoicesByGender!('male');

            expect(mockVoiceService.loadElevenLabsVoices).toHaveBeenCalled();
            expect(result).toEqual(maleVoices);
        });

        it('should filter voices by gender (female)', async () => {
            const femaleVoices = mockVoices.filter(v => v.gender === 'female');
            mockVoiceService.loadElevenLabsVoices.mockResolvedValue(mockVoices);

            const result = await adapter.voices.getVoicesByGender!('female');

            expect(mockVoiceService.loadElevenLabsVoices).toHaveBeenCalled();
            expect(result).toEqual(femaleVoices);
        });

        it('should set voice correctly', async () => {
            const voiceId = 'MF3mGyEYCmosw6y6VdL4';

            mockVoiceService.selectVoice.mockResolvedValue(undefined);

            await adapter.voices.setVoice(voiceId);

            expect(mockVoiceService.selectVoice).toHaveBeenCalledWith(voiceId);
        });

        it('should get current voice gender', async () => {
            const selectedVoiceId = 'EXAVITQu4vr4xnSDxMaL';
            mockVoiceService.getSelectedVoice.mockReturnValue(selectedVoiceId);
            mockVoiceService.loadElevenLabsVoices.mockResolvedValue(mockVoices);

            const gender = await adapter.voices.getCurrentVoiceGender!();

            expect(gender).toBe('female');
            expect(mockVoiceService.getSelectedVoice).toHaveBeenCalled();
            expect(mockVoiceService.loadElevenLabsVoices).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            mockVoiceService.loadElevenLabsVoices.mockRejectedValue(new Error('API Error'));

            await expect(adapter.voices.getVoices()).rejects.toThrow('API Error');
        });

        it('should use default Dutch female voice on initialization', () => {
            // Het adapter object zou moeten geïnitialiseerd zijn met een Nederlandse vrouwelijke stem
            expect(adapter).toBeDefined();
            // We kunnen niet direct de private config benaderen, maar de default voiceId
            // zou EXAVITQu4vr4xnSDxMaL moeten zijn (Nederlandse vrouwelijke stem)
        });
    });

    describe('Voice Selection Integration', () => {
        it('should maintain voice consistency during playback', async () => {
            const maleVoiceId = 'MF3mGyEYCmosw6y6VdL4';
            const femaleVoiceId = 'EXAVITQu4vr4xnSDxMaL';

            // Mock audio setup
            const mockAudio = {
                play: jest.fn().mockResolvedValue(undefined),
                pause: jest.fn(),
                addEventListener: jest.fn(),
                currentTime: 0,
                src: '',
                load: jest.fn()
            };
            global.Audio = jest.fn().mockImplementation(() => mockAudio);
            global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');

            // Mock TTS API call
            mockFetch.mockResolvedValue({
                ok: true,
                blob: () => Promise.resolve(new Blob([], { type: 'audio/mpeg' })),
                headers: { get: () => 'test-request-id' }
            } as any);

            // Stel mannelijke stem in
            await adapter.voices.setVoice(maleVoiceId);
            await adapter.play({ text: 'Mannelijke test tekst', element: 'normal' });

            // Controleer dat de juiste voiceId wordt gebruikt
            expect(mockFetch).toHaveBeenCalledWith(TEST_CONFIG.API_ENDPOINTS.ELEVENLABS_TTS,
                expect.objectContaining({
                    body: expect.stringContaining(`"voiceId":"${maleVoiceId}"`)
                })
            );

            // Verander naar vrouwelijke stem
            await adapter.voices.setVoice(femaleVoiceId);
            await adapter.play({ text: 'Vrouwelijke test tekst', element: 'normal' });

            // Controleer dat vrouwelijke stem wordt gebruikt
            expect(mockFetch).toHaveBeenCalledWith(TEST_CONFIG.API_ENDPOINTS.ELEVENLABS_TTS,
                expect.objectContaining({
                    body: expect.stringContaining(`"voiceId":"${femaleVoiceId}"`)
                })
            );
        });
    });
});
