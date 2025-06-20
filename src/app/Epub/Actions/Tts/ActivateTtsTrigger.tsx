import { ThActionButton } from "@edrlab/thorium-web/core/components";
import { useAppDispatch } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import React from "react";

export const ActivateTtsTrigger = () => {
    const dispatch = useAppDispatch();

    const handlePress = () => {
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.ACTIVATE_TTS,
                isOpen: true
            }
        });
    };

    return (
        <ThActionButton
            key={`${TtsActionKeys.ACTIVATE_TTS}`}
            label="Console Log Action"
            onPress={handlePress}
            style={{ color: "blue" }}
        >
            <span>Log to Console</span>
        </ThActionButton>
    );
};
