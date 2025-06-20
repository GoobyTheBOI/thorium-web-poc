import { ThCollapsibilityVisibility } from "@edrlab/thorium-web/core/components";
import {
    createPreferences,
    defaultPreferences,
    ThPreferences
} from "@edrlab/thorium-web/core/preferences";
import { TtsActionKeys } from "../keys";

const TtsPreference: ThPreferences = createPreferences({
    ...defaultPreferences,

    actions: {
        ...defaultPreferences.actions,

        reflowOrder: [
            TtsActionKeys.fullscreen,
            TtsActionKeys.settings,
            TtsActionKeys.jumpToPosition,
            TtsActionKeys.toc,
            TtsActionKeys.ACTIVATE_TTS,
        ],
        keys: {
            ...defaultPreferences.actions.keys,

            [TtsActionKeys.ACTIVATE_TTS]: {
                visibility: ThCollapsibilityVisibility.always,
                shortcut: null
            },
        }
    },
});

console.log("TtsPreference", TtsPreference);

export { TtsPreference };
