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
                key: TtsActionKeys.activateTts,
                isOpen: true
            }
        });
    };

    return (
        <ThActionButton
            key={`${TtsActionKeys.activateTts}`}
            label="Activate TTS"
            onPress={handlePress}
            style={{ color: "white" }}
        >
            <span>Text to speech</span>
        </ThActionButton>
    );
};
