'use client';

import { useAppSelector, useAppDispatch, RootState } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import React, { useCallback, useEffect, useState } from "react";
import { ThContainerHeader, ThPopover, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { TTSAdapterFactory, AdapterType } from "@/lib/factories/AdapterFactory";
import { TtsState } from "@/lib/managers/TtsStateManager";
import { KeyboardShortcut } from "@/lib/handlers/KeyboardHandler";
import styles from "./ActivateTtsContainer.module.css";

import { useTtsServices, useVoiceManagement, useAdapterManagement } from "../../../../Components/Actions/TTS/hooks";
import { TtsProviderSelector, TtsVoicePanel, TtsControlPanel, TtsStatusDisplay } from "../../../../Components/Actions/TTS";

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();

    const [ttsState, setTtsState] = useState<TtsState>({
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: null
    });
    const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([]);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    // Custom hooks for business logic
    const { getServices, cleanup } = useTtsServices({
        onStateChange: (state) => {
            setTtsState(state);
            if (state.error) {
                setVoicesError(state.error);
            } else if (state.isPlaying || state.isGenerating) {
                setVoicesError(null);
            }
        },
        onAdapterSwitch: (adapter) => {
            setSelectedAdapterType(adapter);
            loadVoices(adapter);
        }
    });

    const { voiceState, loadVoices, handleVoiceChange, setVoicesError } = useVoiceManagement({
        getServices
    });

    const { adapterState, setSelectedAdapterType, setAvailableAdapters, handleAdapterChange } = useAdapterManagement({
        loadVoices,
        cleanup,
        setVoicesError
    });

    useEffect(() => {
        setAvailableAdapters(TTSAdapterFactory.getAvailableAdapters());
    }, [setAvailableAdapters]);

    useEffect(() => {
        const services = getServices();
        const initialState = services.orchestrationService.getState();
        setTtsState(initialState);
        setKeyboardShortcuts(services.keyboardHandler.getShortcuts());
        loadVoices();
    }, [getServices, loadVoices]);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    const handleGenerateTts = useCallback(async () => {
        if (!voiceState.selectedVoice) {
            setVoicesError('Please select a voice');
            return;
        }

        setTtsState(prev => ({ ...prev, isGenerating: true }));
        setVoicesError(null);

        try {
            const { orchestrationService, textExtractionService, voiceHandler } = getServices();

            if (voiceState.selectedVoice) {
                await voiceHandler.setVoice(voiceState.selectedVoice);
            }

            const chunks = await textExtractionService.extractTextChunks();
            if (chunks.length === 0) {
                setVoicesError('No text found to convert');
                return;
            }

            await orchestrationService.startReading();
        } catch (error) {
            console.error('Error generating TTS:', error);
            setVoicesError('Failed to generate audio');
        } finally {
            setTtsState(prev => ({ ...prev, isGenerating: false }));
        }
    }, [voiceState.selectedVoice, getServices, setVoicesError]);

    const handleStop = useCallback(() => {
        const { orchestrationService } = getServices();
        orchestrationService.stopReading();
    }, [getServices]);

    const handlePause = useCallback(() => {
        const { orchestrationService } = getServices();
        if (ttsState.isPlaying && !ttsState.isPaused) {
            orchestrationService.pauseReading();
        }
    }, [getServices, ttsState]);

    const handleResume = useCallback(() => {
        const { orchestrationService } = getServices();
        if (!ttsState.isPlaying && ttsState.isPaused) {
            orchestrationService.resumeReading();
        }
    }, [getServices, ttsState]);

    const handleClose = useCallback(() => {
        const { orchestrationService } = getServices();
        orchestrationService.stopReading();
        cleanup();
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    }, [getServices, cleanup, dispatch]);

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
                    ttsState={ttsState}
                    voicesError={voiceState.voicesError}
                    keyboardShortcuts={keyboardShortcuts}
                />

                <TtsProviderSelector
                    selectedAdapterType={adapterState.selectedAdapterType}
                    availableAdapters={adapterState.availableAdapters}
                    isRecreatingServices={adapterState.isRecreatingServices}
                    isGenerating={ttsState.isGenerating}
                    isPlaying={ttsState.isPlaying}
                    onAdapterChange={handleAdapterChange}
                />

                <TtsVoicePanel
                    voices={voiceState.voices}
                    selectedVoice={voiceState.selectedVoice}
                    isLoadingVoices={voiceState.isLoadingVoices}
                    voicesError={voiceState.voicesError}
                    isGenerating={ttsState.isGenerating}
                    isPlaying={ttsState.isPlaying}
                    onVoiceChange={handleVoiceChange}
                />

                <TtsControlPanel
                    ttsState={ttsState}
                    selectedVoice={voiceState.selectedVoice}
                    onGenerateTts={handleGenerateTts}
                    onPause={handlePause}
                    onResume={handleResume}
                    onStop={handleStop}
                />
            </ThContainerBody>
        </ThPopover>
    );
};
