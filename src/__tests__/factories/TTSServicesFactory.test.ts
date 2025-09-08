import { createTTSServices, destroyTTSServices } from '@/lib/factories/TTSServicesFactory';

describe('TTSServicesFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
                stateManager: undefined,
                textExtractionService: undefined,
                voiceManagementService: undefined,
                orchestrationService: { destroy: jest.fn() },
                keyboardHandler: { cleanup: jest.fn() },
                voiceHandler: { cleanup: jest.fn() },
                currentAdapter: undefined,
            } as unknown as ReturnType<typeof createTTSServices>;

            // Should not throw
            expect(() => destroyTTSServices(partialServices)).not.toThrow();
        });
    });

    describe('Factory Pattern Implementation', () => {
        test('factory functions are available', () => {
            expect(typeof createTTSServices).toBe('function');
            expect(typeof destroyTTSServices).toBe('function');
        });

        test('create function returns object with correct structure', () => {
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
            expect(services1.currentAdapter).not.toBe(services2.currentAdapter);
        });

        test('creates services correctly for different adapter types', () => {
            // This should not throw and services should be created correctly
            const azureServices = createTTSServices('azure');
            const elevenLabsServices = createTTSServices('elevenlabs');

            expect(azureServices.orchestrationService).toBeDefined();
            expect(azureServices.voiceHandler).toBeDefined();
            expect(elevenLabsServices.orchestrationService).toBeDefined();
            expect(elevenLabsServices.voiceHandler).toBeDefined();
        });
    });
});
