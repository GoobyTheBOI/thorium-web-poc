import { ThPlugin, createDefaultPlugin } from "@edrlab/thorium-web/epub";
import { ActivateTtsTrigger, ActivateTtsContainer } from "@/app/Epub/Actions/Tts";
import { TtsActionKeys } from "../Epub/keys";

const defaultPlugin: ThPlugin = createDefaultPlugin();

const TtsPlugin: ThPlugin[] = [defaultPlugin, {
    id: "tts-plugin",
    name: "Text-to-Speech Plugin",
    description: "Text-to-Speech functionality for the Reader",
    version: "0.10.0",
    components: {
        actions: {
            [TtsActionKeys.ACTIVATE_TTS]: {
                Trigger: ActivateTtsTrigger,
                Target: ActivateTtsContainer
            }
        }
    }
}];

export { TtsPlugin }
