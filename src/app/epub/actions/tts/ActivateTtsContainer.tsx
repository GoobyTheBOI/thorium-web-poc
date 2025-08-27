'use client';

import { useAppSelector, useAppDispatch, RootState } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import React, { useCallback, useState, useEffect } from "react";
import { ThContainerHeader, ThPopover, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { KeyboardShortcut } from "@/lib/handlers/KeyboardHandler";
import styles from "./ActivateTtsContainer.module.css";

import { useTts } from "@/Components/Actions/TTS/hooks";
import { TtsProviderSelector, TtsVoicePanel, TtsControlPanel, TtsStatusDisplay } from "../../../../Components/Actions/TTS";

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();
    const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([]);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    const handleStateChange = useCallback((state: any) => {
        console.log('TTS State changed:', state);
    }, []);

    const handleError = useCallback((error: string) => {
        console.error('TTS Error:', error);
    }, []);

    const { ttsState, voiceState, adapterState, actions, cleanup, getKeyboardShortcuts } = useTts({
        onStateChange: handleStateChange,
        onError: handleError
    });

    useEffect(() => {
        try {
            const shortcuts = getKeyboardShortcuts();
            setKeyboardShortcuts(shortcuts);
        } catch (error) {
            console.error('Failed to get keyboard shortcuts:', error);
            setKeyboardShortcuts([]);
        }
    }, [getKeyboardShortcuts]);

    const handleClose = useCallback(() => {
        actions.stop();
        cleanup();
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    }, [actions, cleanup, dispatch]);

    if (!isOpen) return null;

    return (
        <ThPopover
            triggerRef={props.triggerRef}
            isOpen={isOpen}
            onOpenChange={handleClose}
            key={`${TtsActionKeys.activateTts}`}
            className={styles.popover}
        >
            <ThContainerHeader
                label={`Text-to-Speech - ${adapterState.availableAdapters.find(a => a.key === adapterState.selectedAdapterType)?.name || 'Unknown'}`}
                className={styles.header}
            >
                <ThCloseButton onPress={handleClose}>
                    Close
                </ThCloseButton>
            </ThContainerHeader>

            <ThContainerBody>
                <TtsStatusDisplay
                    ttsState={{
                        ...ttsState,
                        currentAdapter: adapterState.selectedAdapterType
                    }}
                    voicesError={voiceState.voicesError}
                    keyboardShortcuts={keyboardShortcuts}
                />

                <TtsProviderSelector
                    selectedAdapterType={adapterState.selectedAdapterType}
                    availableAdapters={adapterState.availableAdapters}
                    isRecreatingServices={adapterState.isRecreatingServices}
                    isGenerating={ttsState.isGenerating}
                    isPlaying={ttsState.isPlaying}
                    onAdapterChange={actions.changeAdapter}
                />

                <TtsVoicePanel
                    voices={voiceState.voices}
                    selectedVoice={voiceState.selectedVoice}
                    isLoadingVoices={voiceState.isLoadingVoices}
                    voicesError={voiceState.voicesError}
                    isGenerating={ttsState.isGenerating}
                    isPlaying={ttsState.isPlaying}
                    onVoiceChange={actions.changeVoice}
                />

                <TtsControlPanel
                    ttsState={{
                        ...ttsState,
                        currentAdapter: adapterState.selectedAdapterType
                    }}
                    selectedVoice={voiceState.selectedVoice}
                    onGenerateTts={actions.generateTts}
                    onPause={actions.pause}
                    onResume={actions.resume}
                    onStop={actions.stop}
                />
            </ThContainerBody>
        </ThPopover>
    );
};
