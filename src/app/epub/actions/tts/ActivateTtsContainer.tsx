'use client';

import { useAppSelector, useAppDispatch, RootState, StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "@/app/epub/keys";
import React, { useCallback, useState, useEffect } from "react";
import { ThContainerHeader, ThPopover, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { KeyboardShortcut } from "@/lib/handlers/KeyboardHandler";
import { TtsState } from '@/lib/managers/TtsStateManager';
import styles from "./ActivateTtsContainer.module.css";
import { useTts } from "@/Components/Actions/TTS/hooks";
import { TtsProviderSelector, TtsVoicePanel, TtsControlPanel, TtsStatusDisplay, TtsToggle } from "@/Components/Actions/TTS";

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();
    const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([]);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    const handleStateChange = useCallback((state: TtsState) => {
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

    // Cleanup only when component unmounts, not when popup closes
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const handleClose = useCallback(() => {
        actions.stop();
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    }, [actions, dispatch]);

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
                <TtsToggle
                    isEnabled={ttsState.isEnabled}
                    isPlaying={ttsState.isPlaying}
                    isPaused={ttsState.isPaused}
                    isGenerating={ttsState.isGenerating}
                    onToggle={actions.toggleTtsEnabled}
                />

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
                    isEnabled={ttsState.isEnabled}
                    onAdapterChange={actions.changeAdapter}
                />

                <TtsVoicePanel
                    voices={voiceState.voices}
                    selectedVoice={voiceState.selectedVoice}
                    isLoadingVoices={voiceState.isLoadingVoices}
                    voicesError={voiceState.voicesError}
                    isGenerating={ttsState.isGenerating}
                    isPlaying={ttsState.isPlaying}
                    isEnabled={ttsState.isEnabled}
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
