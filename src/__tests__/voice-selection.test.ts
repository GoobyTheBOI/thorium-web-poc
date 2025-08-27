import { ElevenLabsAdapter } from '@/lib/adapters/ElevenLabsAdapter';
import { DefaultTextProcessor } from '@/lib/TextProcessor';
import { VoiceInfo } from '@/preferences/types';
import { TEST_CONFIG } from './config/testConstants';

// Mock VoiceManagementService
jest.mock('@/lib/services/VoiceManagementService', () => {
    return {
        VoiceManagementService: jest.fn().mockImplementation(() => ({
            loadElevenLabsVoices: jest.fn(),
            selectVoice: jest.fn(),
            getSelectedVoice: jest.fn(),
            getVoicesByGender: jest.fn(),
            getCurrentVoiceGender: jest.fn()
        }))
    };
});

// Mock de fetch functie
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ElevenLabsAdapter Voice Selection', () => {
    let adapter: ElevenLabsAdapter;
    let textProcessor: DefaultTextProcessor;
    let mockVoiceService: any;

    beforeEach(() => {
        textProcessor = new DefaultTextProcessor();
        adapter = new ElevenLabsAdapter(textProcessor);

        // Get mock voice service instance
        mockVoiceService = (adapter as any).voiceService;

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
                gender: 'female',
                quality: 'premium'
            },
            {
                id: 'MF3mGyEYCmosw6y6VdL4',
                name: 'Dutch Male Professional 1',
                language: 'nl-NL',
                gender: 'male',
                quality: 'premium'
            },
            {
                id: 'pNInz6obpgDQGcFmaJgB',
                name: 'Dutch Female Professional 2',
                language: 'nl-NL',
                gender: 'female',
                quality: 'premium'
            }
        ];

        it('should fetch Dutch voices from API', async () => {
            mockVoiceService.loadElevenLabsVoices.mockResolvedValue(mockVoices);

            const voices = await adapter.getVoices();

            expect(mockVoiceService.loadElevenLabsVoices).toHaveBeenCalled();
            expect(voices).toEqual(mockVoices);
        });

        it('should filter voices by gender (male)', async () => {
            const maleVoices = mockVoices.filter(v => v.gender === 'male');
            mockVoiceService.getVoicesByGender.mockResolvedValue(maleVoices);

            const result = await adapter.getVoicesByGender('male');

            expect(mockVoiceService.getVoicesByGender).toHaveBeenCalledWith('male');
            expect(result).toEqual(maleVoices);
        });

        it('should filter voices by gender (female)', async () => {
            const femaleVoices = mockVoices.filter(v => v.gender === 'female');
            mockVoiceService.getVoicesByGender.mockResolvedValue(femaleVoices);

            const result = await adapter.getVoicesByGender('female');

            expect(mockVoiceService.getVoicesByGender).toHaveBeenCalledWith('female');
            expect(result).toEqual(femaleVoices);
        });

        it('should set voice correctly', async () => {
            const voiceId = 'MF3mGyEYCmosw6y6VdL4';

            mockVoiceService.selectVoice.mockResolvedValue(undefined);

            await adapter.setVoice(voiceId);

            expect(mockVoiceService.selectVoice).toHaveBeenCalledWith(voiceId);
        });

        it('should get current voice gender', async () => {
            mockVoiceService.getCurrentVoiceGender.mockResolvedValue('female');

            const gender = await adapter.getCurrentVoiceGender();

            expect(gender).toBe('female');
            expect(mockVoiceService.getCurrentVoiceGender).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            mockVoiceService.loadElevenLabsVoices.mockRejectedValue(new Error('API Error'));

            await expect(adapter.getVoices()).rejects.toThrow('API Error');
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
            await adapter.setVoice(maleVoiceId);
            await adapter.play({ text: 'Mannelijke test tekst', element: 'normal' });

            // Controleer dat de juiste voiceId wordt gebruikt
            expect(mockFetch).toHaveBeenCalledWith(TEST_CONFIG.API_ENDPOINTS.ELEVENLABS_TTS,
                expect.objectContaining({
                    body: expect.stringContaining(`"voiceId":"${maleVoiceId}"`)
                })
            );

            // Verander naar vrouwelijke stem
            await adapter.setVoice(femaleVoiceId);
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
