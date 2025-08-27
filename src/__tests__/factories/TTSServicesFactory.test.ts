import { TTSServicesFactory, TTSServiceDependencies } from '../../lib/factories/TTSServicesFactory';
import { AdapterType, TTSAdapterFactory } from '../../lib/factories/AdapterFactory';
import { TtsState } from '../../lib/managers/TtsStateManager';

describe('TTSServicesFactory', () => {
    const mockOnStateChange = jest.fn<void, [TtsState]>();
    const mockOnAdapterSwitch = jest.fn<void, [AdapterType]>();
    let adapterFactory: TTSAdapterFactory;

    beforeEach(() => {
        jest.clearAllMocks();
        adapterFactory = new TTSAdapterFactory();
    });

    describe('Service Creation', () => {
        test('creates all required services', () => {
            const adapter = adapterFactory.createAdapter('azure');
            const services = TTSServicesFactory.create(
                adapter,
                'azure',
                mockOnStateChange,
                mockOnAdapterSwitch
            );

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
            expect(services.currentAdapter).toBe(adapter);
        });

        test('creates services for different adapter types', () => {
            const azureAdapter = adapterFactory.createAdapter('azure');
            const azureServices = TTSServicesFactory.create(
                azureAdapter,
                'azure',
                mockOnStateChange
            );

            const elevenLabsAdapter = adapterFactory.createAdapter('elevenlabs');
            const elevenLabsServices = TTSServicesFactory.create(
                elevenLabsAdapter,
                'elevenlabs',
                mockOnStateChange
            );

            expect(azureServices.currentAdapter).toBeDefined();
            expect(elevenLabsServices.currentAdapter).toBeDefined();

            // Should have different adapter instances
            expect(azureServices.currentAdapter).not.toBe(elevenLabsServices.currentAdapter);
            expect(azureServices.currentAdapter).toBe(azureAdapter);
            expect(elevenLabsServices.currentAdapter).toBe(elevenLabsAdapter);
        });
    });

    describe('Service Destruction', () => {
        test('destroy method completes without throwing', () => {
            const adapter = adapterFactory.createAdapter('azure');
            const services = TTSServicesFactory.create(
                adapter,
                'azure',
                mockOnStateChange
            );

            // Should not throw
            expect(() => TTSServicesFactory.destroy(services)).not.toThrow();
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
            expect(() => TTSServicesFactory.destroy(partialServices)).not.toThrow();
        });
    });

    describe('Factory Pattern Implementation', () => {
        test('factory methods are static', () => {
            expect(typeof TTSServicesFactory.create).toBe('function');
            expect(typeof TTSServicesFactory.destroy).toBe('function');
        });

        test('create method returns object with correct structure', () => {
            const adapter = adapterFactory.createAdapter('azure');
            const services = TTSServicesFactory.create(
                adapter,
                'azure',
                mockOnStateChange
            );

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
            const adapter1 = adapterFactory.createAdapter('azure');
            const services1 = TTSServicesFactory.create(
                adapter1,
                'azure',
                mockOnStateChange
            );
            const adapter2 = adapterFactory.createAdapter('azure');
            const services2 = TTSServicesFactory.create(
                adapter2,
                'azure',
                mockOnStateChange
            );

            expect(services1.orchestrationService).not.toBe(services2.orchestrationService);
            expect(services1.voiceManagementService).not.toBe(services2.voiceManagementService);
            expect(services1.textExtractionService).not.toBe(services2.textExtractionService);
            expect(services1.keyboardHandler).not.toBe(services2.keyboardHandler);
        });

        test('passes callbacks correctly', () => {
            // This should not throw and callbacks should be wired up
            const adapter = adapterFactory.createAdapter('azure');
            const services = TTSServicesFactory.create(
                adapter,
                'azure',
                mockOnStateChange,
                mockOnAdapterSwitch
            );

            expect(services.orchestrationService).toBeDefined();
            expect(services.voiceHandler).toBeDefined();
        });
    });
});
