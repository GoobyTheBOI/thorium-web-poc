import { AdapterType, createAdapter } from "@/lib/factories/AdapterFactory";
import { EpubTextExtractionService } from "@/lib/services/TextExtractionService";
import { TtsOrchestrationService, TtsCallbacks } from "@/lib/services/TtsOrchestrationService";
import { VoiceManagementService } from "@/lib/services/VoiceManagementService";
import { TtsKeyboardHandler } from "@/lib/handlers/TtsKeyboardHandler";
import { VoiceHandler } from "@/lib/handlers/VoiceHandler";
import { TtsStateManager } from "@/lib/managers/TtsStateManager";
import { IPlaybackAdapter } from "@/preferences/types";

export interface TTSServices {
    textExtractionService: EpubTextExtractionService;
    voiceManagementService: VoiceManagementService;
    orchestrationService: TtsOrchestrationService;
    keyboardHandler: TtsKeyboardHandler;
    voiceHandler: VoiceHandler;
    currentAdapter: IPlaybackAdapter;
}

export interface TTSFactoryCallbacks extends TtsCallbacks {
    onToggle?: () => void;
}

export function createTTSServices(adapterType: AdapterType, callbacks?: TTSFactoryCallbacks): TTSServices {
    const textExtractionService = new EpubTextExtractionService();
    const voiceManagementService = new VoiceManagementService();
    const stateManager = new TtsStateManager();
    const adapter = createAdapter(adapterType, voiceManagementService);

    // Create orchestration service
    const orchestrationService = new TtsOrchestrationService(
        adapter,
        textExtractionService,
        stateManager,
        voiceManagementService,
        adapterType,
        callbacks
    );

    const keyboardHandler = new TtsKeyboardHandler(orchestrationService, callbacks?.onToggle);
    const voiceHandler = new VoiceHandler({ adapter });

    return {
        textExtractionService,
        voiceManagementService,
        orchestrationService,
        keyboardHandler,
        voiceHandler,
        currentAdapter: adapter
    };
}

export function destroyTTSServices(services: TTSServices): void {
    services.orchestrationService.destroy();
    services.keyboardHandler.cleanup();
    services.voiceHandler.cleanup();
}
