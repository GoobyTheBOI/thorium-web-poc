'use client';

import { useAppSelector, useAppDispatch, RootState } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { IVoices } from "readium-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ThContainerHeader, ThPopover, ThActionButton, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { IPlaybackAdapter } from "@/preferences/types";
import { TTSAdapterFactory, AdapterType, AdapterOption } from "@/lib/AdapterFactory";
import {
    EpubTextExtractionService
} from "@/lib/services/TextExtractionService";
import {
    TtsOrchestrationService,
    TtsCallbacks
} from "@/lib/services/TtsOrchestrationService";
import {
    VoiceManagementService
} from "@/lib/services/VoiceManagementService";
import { KeyboardShortcut } from "@/lib/handlers/KeyboardHandler";
import { TtsKeyboardHandler } from "@/lib/handlers/TtsKeyboardHandler";
import { TtsState } from "@/lib/managers/TtsStateManager";
import styles from "./ActivateTtsContainer.module.css";

// SOLID: Dependency Injection Container
interface TTSServiceDependencies {
    adapterFactory: TTSAdapterFactory;
    textExtractionService: EpubTextExtractionService;
    voiceManagementService: VoiceManagementService;
    orchestrationService: TtsOrchestrationService;
    keyboardHandler: TtsKeyboardHandler;
    currentAdapter: IPlaybackAdapter;
}

const createTTSServices = (
    adapterType: AdapterType = 'elevenlabs',
    onStateChange?: (state: TtsState) => void,
    onAdapterSwitch?: (newAdapter: AdapterType) => void
): TTSServiceDependencies => {
    const adapterFactory = new TTSAdapterFactory();
    const adapter: IPlaybackAdapter = adapterFactory.createAdapter(adapterType);
    const textExtractionService = new EpubTextExtractionService();
    const voiceManagementService = new VoiceManagementService();

    const callbacks: TtsCallbacks = {
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
        adapterType,
        callbacks
    );

    const keyboardHandler = new TtsKeyboardHandler(orchestrationService);

    return {
        adapterFactory,
        textExtractionService,
        voiceManagementService,
        orchestrationService,
        keyboardHandler,
        currentAdapter: adapter
    };
};

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();

    // UI State only (SOLID: Single Responsibility)
    const [voices, setVoices] = useState<IVoices[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [voicesError, setVoicesError] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [keyboardShortcuts, setKeyboardShortcuts] = useState<KeyboardShortcut[]>([]);

    // Adapter selection state (SOLID: Single Responsibility)
    const [selectedAdapterType, setSelectedAdapterType] = useState<AdapterType>('elevenlabs');
    const [availableAdapters] = useState<AdapterOption[]>(TTSAdapterFactory.getAvailableAdapters());
    const [isRecreatingingServices, setIsRecreatingServices] = useState(false);

    // TTS State from the state manager
    const [ttsState, setTtsState] = useState<TtsState>({
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: null
    });

    // Service references (SOLID: Dependency Inversion)
    const servicesRef = useRef<TTSServiceDependencies | null>(null);
    const loadVoicesRef = useRef<((adapterType?: AdapterType) => Promise<void>) | null>(null);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    // SOLID: Service creation with adapter selection
    const getServices = useCallback((adapterType: AdapterType = selectedAdapterType): TTSServiceDependencies => {
        // If services exist for a different adapter type, clean them up first
        const currentAdapterType = servicesRef.current?.orchestrationService.getCurrentAdapterType();
        if (servicesRef.current && currentAdapterType && currentAdapterType !== adapterType) {
            console.log('Cleaning up existing services before creating new ones');
            servicesRef.current.orchestrationService.destroy();
            servicesRef.current.keyboardHandler.cleanup();
            servicesRef.current = null;
        }

        if (!servicesRef.current) {
            console.log('Creating new TTS services for adapter:', adapterType);

            const handleStateChange = (state: TtsState) => {
                setTtsState(state);
                if (state.error) {
                    setVoicesError(state.error);
                }
            };

            const handleAdapterSwitch = (newAdapter: AdapterType) => {
                setSelectedAdapterType(newAdapter);
                // Reload voices for the new adapter using the ref
                if (loadVoicesRef.current) {
                    loadVoicesRef.current(newAdapter);
                }
            };

            servicesRef.current = createTTSServices(adapterType, handleStateChange, handleAdapterSwitch);

            // Get initial state
            const initialState = servicesRef.current.orchestrationService.getState();
            setTtsState(initialState);

            setKeyboardShortcuts(servicesRef.current.keyboardHandler.getShortcuts());
        }

        return servicesRef.current;
    }, []); // Remove selectedAdapterType dependency to make this function stable

    const loadVoices = useCallback(async (adapterType?: AdapterType) => {
        setIsLoadingVoices(true);
        setVoicesError(null);

        try {
            const { voiceManagementService } = getServices(adapterType);
            const voiceList = await voiceManagementService.loadVoices();
            setVoices(voiceList);

            // Set default voice
            if (voiceList.length > 0) {
                setSelectedVoice(voiceList[0].voiceURI);
            }
        } catch (error) {
            console.error('Error loading voices:', error);
            setVoicesError('Failed to load voices');
        } finally {
            setIsLoadingVoices(false);
        }
    }, [getServices]);

    // Set the ref so the callback can use it
    loadVoicesRef.current = loadVoices;

    // SOLID: Adapter type change handler (Single Responsibility)
    const handleAdapterChange = useCallback(async (newAdapterType: AdapterType) => {
        if (newAdapterType === selectedAdapterType) return;

        // Check if new adapter is implemented
        const adapter = availableAdapters.find(a => a.key === newAdapterType);
        if (!adapter?.isImplemented) {
            setVoicesError(`${adapter?.name || 'This adapter'} is not yet implemented`);
            return;
        }

        setIsRecreatingServices(true);
        setVoicesError(null);

        try {
            // Clean up existing services
            if (servicesRef.current) {
                servicesRef.current.orchestrationService.destroy();
                servicesRef.current.keyboardHandler.cleanup();
            }

            // Clear services ref to force recreation
            servicesRef.current = null;

            // Update adapter type (this will trigger service recreation in getServices)
            setSelectedAdapterType(newAdapterType);

            // Reset states
            setSelectedVoice(null);

            // Load voices for new adapter
            await loadVoices();

        } catch (error) {
            console.error('Error changing adapter:', error);
            setVoicesError(`Failed to switch to ${adapter?.name || 'new adapter'}`);
        } finally {
            setIsRecreatingServices(false);
        }
    }, [selectedAdapterType, availableAdapters, loadVoices]);

    useEffect(() => {
        loadVoices();
    }, [loadVoices]);

    // Cleanup on component unmount (SOLID: Single Responsibility for cleanup)
    useEffect(() => {
        return () => {
            if (servicesRef.current) {
                console.log('Cleaning up TTS services on component unmount');
                servicesRef.current.orchestrationService.destroy();
                servicesRef.current.keyboardHandler.cleanup();
                servicesRef.current = null;
            }
        };
    }, []);



    const handleGenerateTts = async () => {
        if (!selectedVoice) {
            setVoicesError('Please select a voice');
            return;
        }

        setTtsState(prev => ({ ...prev, isGenerating: true }));
        setVoicesError(null);

        try {
            const { orchestrationService, textExtractionService } = getServices();

            // Extract text using service (SOLID: Single Responsibility)
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
    };

    const handleStop = () => {
        const { orchestrationService } = getServices();
        orchestrationService.stopReading();
    };

    const handlePause = () => {
        const { orchestrationService } = getServices();
        if (ttsState.isPlaying && !ttsState.isPaused) {
            orchestrationService.pauseReading();
        }
    };

    const handleResume = () => {
        const { orchestrationService } = getServices();
        if (!ttsState.isPlaying && ttsState.isPaused) {
            orchestrationService.resumeReading();
        }
    };

    const cleanupTts = () => {
        try {
            if (servicesRef.current) {
                const { orchestrationService } = servicesRef.current;
                orchestrationService.stopReading();
                orchestrationService.destroy?.(); // Clean up if destroy method exists
            }
        } catch (error) {
            console.error('Error during TTS cleanup:', error);
        }
    };

    useEffect(() => {
        return () => {
            cleanupTts();
        };
    }, []);

    if (!isOpen) return null;

    const handleClose = () => {
        cleanupTts();
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    };

    const getStatusMessage = () => {
        if (ttsState.isGenerating) return "Generating audio...";
        if (ttsState.isPlaying) return "Playing with SOLID architecture";
        if (ttsState.isPaused) return "Paused";
        return "Ready";
    };

    const formatShortcut = (shortcut: KeyboardShortcut): string => {
        const modifiers = [];
        if (shortcut.ctrlKey) modifiers.push('Ctrl');
        if (shortcut.altKey) modifiers.push('Alt');
        if (shortcut.shiftKey) modifiers.push('Shift');

        const key = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
        return `${modifiers.join('+')}${modifiers.length > 0 ? '+' : ''}${key}`;
    };

    return (
        <ThPopover
            triggerRef={props.triggerRef}
            isOpen={isOpen}
            onOpenChange={handleClose}
            key={`${TtsActionKeys.activateTts}`}
            className={styles.popover}
        >
            <ThContainerHeader
                label={`Text-to-Speech - ${availableAdapters.find(a => a.key === selectedAdapterType)?.name || 'Unknown'}`}
                className={styles.header}
            >
                <ThCloseButton onPress={handleClose}>
                    Close
                </ThCloseButton>
            </ThContainerHeader>

            <ThContainerBody>
                {voicesError && (
                    <div className={styles.errorContainer}>
                        <p className={styles.errorText}>
                            Error: {voicesError}
                        </p>
                    </div>
                )}

                <div className={styles.statusContainer}>
                    <p className={styles.statusText}>
                        Status: {getStatusMessage()}
                    </p>
                </div>

                {/* TTS Provider Selection (SOLID: Open/Closed Principle) */}
                <div className={styles.adapterSelection}>
                    <label className={styles.label}>
                        TTS Provider:
                    </label>
                    <select
                        value={selectedAdapterType}
                        onChange={(e) => handleAdapterChange(e.target.value as AdapterType)}
                        disabled={ttsState.isGenerating || ttsState.isPlaying || isRecreatingingServices}
                        className={styles.select}
                    >
                        {availableAdapters.map((adapter) => (
                            <option
                                key={adapter.key}
                                value={adapter.key}
                                disabled={!adapter.isImplemented}
                            >
                                {adapter.name} {!adapter.isImplemented ? "(Coming Soon)" : ""}
                            </option>
                        ))}
                    </select>

                    {/* Adapter Description */}
                    {(() => {
                        const currentAdapter = availableAdapters.find(a => a.key === selectedAdapterType);
                        return currentAdapter && (
                            <p className={styles.adapterDescription}>
                                {currentAdapter.description}
                                {currentAdapter.requiresApiKey && " (Requires API Key)"}
                            </p>
                        );
                    })()}

                    {isRecreatingingServices && (
                        <p className={styles.switchingMessage}>
                            🔄 Switching TTS provider...
                        </p>
                    )}
                </div>

                {/* Voice Selection */}
                <div className={styles.voiceSelection}>
                    <label className={styles.voiceLabel}>
                        Voice Selection:
                    </label>
                    {isLoadingVoices ? (
                        <span className={styles.loadingText}>Loading voices...</span>
                    ) : (
                        <select
                            value={selectedVoice || ''}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            disabled={ttsState.isGenerating || ttsState.isPlaying}
                            className={styles.select}
                        >
                            <option value="">Select a voice</option>
                            {voices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className={styles.buttonContainer}>
                    <ThActionButton
                        isDisabled={!selectedVoice || ttsState.isGenerating || ttsState.isPlaying}
                        onPress={handleGenerateTts}
                        style={{ backgroundColor: "#4CAF50", color: "white" }}
                    >
                        {ttsState.isGenerating ? 'Generating...' : 'Start TTS'}
                    </ThActionButton>

                    <ThActionButton
                        onPress={ttsState.isPaused ? handleResume : handlePause}
                        isDisabled={!ttsState.isPlaying && !ttsState.isPaused}
                        style={{ backgroundColor: "#FF9800", color: "white" }}
                    >
                        {ttsState.isPaused ? 'Resume' : 'Pause'}
                    </ThActionButton>

                    <ThActionButton
                        onPress={handleStop}
                        isDisabled={!ttsState.isPlaying && !ttsState.isPaused}
                        style={{ backgroundColor: "#f44336", color: "white" }}
                    >
                        Stop
                    </ThActionButton>
                </div>

                {/* Keyboard Shortcuts Section */}
                <div className={styles.shortcutsContainer}>
                    <h4 className={styles.shortcutsTitle}>
                        Keyboard Shortcuts:
                    </h4>
                    {keyboardShortcuts.map((shortcut, index) => (
                        <div key={index} className={styles.shortcutItem}>
                            <span>{shortcut.description}:</span>
                            <code className={styles.shortcutCode}>
                                {formatShortcut(shortcut)}
                            </code>
                        </div>
                    ))}
                </div>
            </ThContainerBody>
        </ThPopover>
    );
};
