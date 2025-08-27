import { AdapterType, TTSAdapterFactory } from "@/lib/factories/AdapterFactory";
import { EpubTextExtractionService } from "@/lib/services/TextExtractionService";
import { TtsOrchestrationService, TtsCallbacks } from "@/lib/services/TtsOrchestrationService";
import { VoiceManagementService } from "@/lib/services/VoiceManagementService";
import { TtsKeyboardHandler } from "@/lib/handlers/TtsKeyboardHandler";
import { VoiceHandler, VoiceChangeCallback } from "@/lib/handlers/VoiceHandler";
import { TtsState, TtsStateManager } from "@/lib/managers/TtsStateManager";
import { IPlaybackAdapter, VoiceInfo } from "@/preferences/types";

// SOLID: Dependency Injection Container Interface
export interface TTSServiceDependencies {
    adapterFactory: TTSAdapterFactory;
    textExtractionService: EpubTextExtractionService;
    voiceManagementService: VoiceManagementService;
    orchestrationService: TtsOrchestrationService;
    keyboardHandler: TtsKeyboardHandler;
    voiceHandler: VoiceHandler;
    currentAdapter: IPlaybackAdapter;
}


export class TTSServicesFactory {
    static create(
        adapterType: AdapterType,
        onStateChange: (state: TtsState) => void,
        onAdapterSwitch?: (adapter: AdapterType) => void
    ): TTSServiceDependencies {
        const textExtractionService = new EpubTextExtractionService();
        const voiceManagementService = new VoiceManagementService();
        const stateManager = new TtsStateManager();
        const adapterFactory = new TTSAdapterFactory(voiceManagementService);
        const adapter = adapterFactory.createAdapter(adapterType);

        const orchestrationCallbacks: TtsCallbacks = {
            onStateChange: onStateChange,
            onError: (error: string) => {
                console.error('TTS Error:', error);
            },
            onAdapterSwitch: (newAdapter: AdapterType) => {
                console.log('Adapter switched to:', newAdapter);
                onAdapterSwitch?.(newAdapter);
            }
        };

        const orchestrationService = new TtsOrchestrationService(
            adapter,
            textExtractionService,
            stateManager,
            adapterFactory,
            adapterType,
            orchestrationCallbacks
        );

        const keyboardHandler = new TtsKeyboardHandler(orchestrationService);

        const voiceCallbacks: VoiceChangeCallback = {
            onVoiceChanged: (voiceId: string, voiceInfo?: VoiceInfo) => {
                console.log(`Voice changed to: ${voiceId}`, voiceInfo);
            },
            onVoiceError: (error: string, voiceId: string) => {
                console.error(`Voice error for ${voiceId}:`, error);
            },
            onVoicesLoaded: (voices: VoiceInfo[]) => {
                console.log(`Loaded ${voices.length} voices`);
            }
        };

        const voiceHandler = new VoiceHandler({
            adapter,
            callbacks: voiceCallbacks
        });

        return {
            adapterFactory,
            textExtractionService,
            voiceManagementService,
            orchestrationService,
            keyboardHandler,
            voiceHandler,
            currentAdapter: adapter
        };
    }

    static destroy(services: TTSServiceDependencies): void {
        try {
            services.orchestrationService.destroy();
            services.keyboardHandler.cleanup();
            services.voiceHandler.cleanup();
        } catch (error) {
            console.error('Error destroying TTS services:', error);
        }
    }
}
