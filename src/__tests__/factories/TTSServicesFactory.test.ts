import { createTTSServices, destroyTTSServices, TTSServices } from '../../lib/factories/TTSServicesFactory';
import { AdapterType, createAdapter } from '../../lib/factories/AdapterFactory';
import { TtsState } from '../../lib/managers/TtsStateManager';
import { VoiceManagementService } from '../../lib/services/VoiceManagementService';

describe('TTSServicesFactory', () => {
    const mockOnStateChange = jest.fn<void, [TtsState]>();
    const mockOnAdapterSwitch = jest.fn<void, [AdapterType]>();
    let voiceManagementService: VoiceManagementService;

    beforeEach(() => {
        jest.clearAllMocks();
        voiceManagementService = new VoiceManagementService();
    });

    describe('Service Creation', () => {
        test('creates all required services', () => {
            const services = createTTSServices('azure');

            expect(services).toHaveProperty('textExtractionService');
            expect(services).toHaveProperty('voiceManagementService');
            expect(services).toHaveProperty('orchestrationService');
            expect(services).toHaveProperty('keyboardHandler');
            expect(services).toHaveProperty('voiceHandler');
            expect(services).toHaveProperty('currentAdapter');

            // Check that services are properly instantiated
            expect(services.textExtractionService).toBeDefined();
            expect(services.voiceManagementService).toBeDefined();
            expect(services.orchestrationService).toBeDefined();
            expect(services.keyboardHandler).toBeDefined();
            expect(services.voiceHandler).toBeDefined();
            expect(services.currentAdapter).toBeDefined();
        });

        test('creates services for different adapter types', () => {
            const azureServices = createTTSServices('azure');
            const elevenLabsServices = createTTSServices('elevenlabs');

            expect(azureServices.currentAdapter).toBeDefined();
            expect(elevenLabsServices.currentAdapter).toBeDefined();

            // Should have different adapter instances
            expect(azureServices.currentAdapter).not.toBe(elevenLabsServices.currentAdapter);
        });
    });

    describe('Service Destruction', () => {
        test('destroy method completes without throwing', () => {
            const services = createTTSServices('azure');

            // Should not throw
            expect(() => destroyTTSServices(services)).not.toThrow();
        });

        test('handles undefined services gracefully', () => {
            const partialServices = {
                textExtractionService: undefined,
                voiceManagementService: undefined,
                orchestrationService: { destroy: jest.fn() },
                keyboardHandler: { cleanup: jest.fn() },
                voiceHandler: { cleanup: jest.fn() },
                currentAdapter: undefined,
            } as any;

            // Should not throw
            expect(() => destroyTTSServices(partialServices)).not.toThrow();
        });
    });

    describe('Factory Pattern Implementation', () => {
        test('factory methods are functions', () => {
            expect(typeof createTTSServices).toBe('function');
            expect(typeof destroyTTSServices).toBe('function');
        });

        test('create method returns object with correct structure', () => {
            const services = createTTSServices('azure');

            expect(services).toEqual({
                textExtractionService: expect.any(Object),
                voiceManagementService: expect.any(Object),
                orchestrationService: expect.any(Object),
                keyboardHandler: expect.any(Object),
                voiceHandler: expect.any(Object),
                currentAdapter: expect.any(Object),
            });
        });

        test('each call to create returns new instances', () => {
            const services1 = createTTSServices('azure');
            const services2 = createTTSServices('azure');

            expect(services1.orchestrationService).not.toBe(services2.orchestrationService);
            expect(services1.voiceManagementService).not.toBe(services2.voiceManagementService);
            expect(services1.textExtractionService).not.toBe(services2.textExtractionService);
            expect(services1.keyboardHandler).not.toBe(services2.keyboardHandler);
        });

        test('passes configuration correctly', () => {
            // This should not throw and services should be properly configured
            const services = createTTSServices('azure');

            expect(services.orchestrationService).toBeDefined();
            expect(services.voiceHandler).toBeDefined();
        });
    });
});
