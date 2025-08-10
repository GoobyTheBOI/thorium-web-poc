'use client';

import { useAppSelector, useAppDispatch, RootState } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { IVoices } from "readium-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ThContainerHeader, ThPopover, ThActionButton, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { IAdapterConfig, IContextualPlaybackAdapter, IPlaybackAdapter } from "@/preferences/types";
import { TTSAdapterFactory, AdapterType, AdapterOption } from "@/lib/AdapterFactory";
import {
    EpubTextExtractionService,
    ITextExtractionService
} from "@/lib/services/TextExtractionService";
import {
    TtsOrchestrationService,
    ITtsOrchestrationService
} from "@/lib/services/TtsOrchestrationService";
import {
    VoiceManagementService,
    IVoiceManagementService
} from "@/lib/services/VoiceManagementService";
import { ShortcutConfig } from "@/lib/services/KeyboardShortcutService";

// SOLID: Dependency Injection Container
interface TTSServiceDependencies {
    adapterFactory: TTSAdapterFactory;
    textExtractionService: ITextExtractionService;
    voiceManagementService: IVoiceManagementService;
    orchestrationService: ITtsOrchestrationService;
    currentAdapter: IPlaybackAdapter;
    currentAdapterType: AdapterType;
}

const createTTSServices = (adapterType: AdapterType = 'elevenlabs'): TTSServiceDependencies => {
    const adapterFactory = new TTSAdapterFactory();

    const config: IAdapterConfig = {
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        modelId: 'eleven_multilingual_v2'
    };

    const adapter: IPlaybackAdapter = adapterFactory.createAdapter(adapterType, config);

    const textExtractionService = new EpubTextExtractionService();
    const voiceManagementService = new VoiceManagementService();
    const orchestrationService = new TtsOrchestrationService(adapter, textExtractionService);

    return {
        adapterFactory,
        textExtractionService,
        voiceManagementService,
        orchestrationService,
        currentAdapter: adapter,
        currentAdapterType: adapterType
    };
};

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();

    // UI State only (SOLID: Single Responsibility)
    const [voices, setVoices] = useState<IVoices[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [voicesError, setVoicesError] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [keyboardShortcuts, setKeyboardShortcuts] = useState<ShortcutConfig[]>([]);

    // Adapter selection state (SOLID: Single Responsibility)
    const [selectedAdapterType, setSelectedAdapterType] = useState<AdapterType>('elevenlabs');
    const [availableAdapters] = useState<AdapterOption[]>(TTSAdapterFactory.getAvailableAdapters());
    const [isRecreatingingServices, setIsRecreatingServices] = useState(false);

    // Service references (SOLID: Dependency Inversion)
    const servicesRef = useRef<TTSServiceDependencies | null>(null);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    // SOLID: Service creation with adapter selection
    const getServices = useCallback((adapterType: AdapterType = selectedAdapterType): TTSServiceDependencies => {
        if (!servicesRef.current || servicesRef.current.currentAdapterType !== adapterType) {
            // Cleanup existing services if they exist
            if (servicesRef.current) {
                servicesRef.current.orchestrationService.stopReading();
                // Try to destroy if method exists (duck typing)
                if ('destroy' in servicesRef.current.currentAdapter &&
                    typeof servicesRef.current.currentAdapter.destroy === 'function') {
                    servicesRef.current.currentAdapter.destroy();
                }
            }

            servicesRef.current = createTTSServices(adapterType);

            setKeyboardShortcuts(servicesRef.current.orchestrationService.getShortcuts());

            const { orchestrationService } = servicesRef.current;

            orchestrationService.on('play', () => {
                setIsPlaying(true);
                setIsPaused(false);
            });

            orchestrationService.on('pause', () => {
                setIsPlaying(false);
                setIsPaused(true);
            });

            orchestrationService.on('resume', () => {
                setIsPlaying(true);
                setIsPaused(false);
            });

            orchestrationService.on('stop', () => {
                setIsPlaying(false);
                setIsPaused(false);
            });

            orchestrationService.on('end', () => {
                setIsPlaying(false);
                setIsPaused(false);
            });

            orchestrationService.on('error', (info: unknown) => {
                const errorInfo = info as { error?: { message?: string } };
                setVoicesError(`TTS Error: ${errorInfo.error?.message || 'Unknown error'}`);
                setIsPlaying(false);
                setIsPaused(false);
            });
        }

        return servicesRef.current;
    }, [selectedAdapterType]);

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
            // Stop current playback
            if (servicesRef.current) {
                servicesRef.current.orchestrationService.stopReading();
            }

            // Update adapter type (this will trigger service recreation in getServices)
            setSelectedAdapterType(newAdapterType);

            // Clear services ref to force recreation
            servicesRef.current = null;

            // Reset states
            setIsPlaying(false);
            setIsPaused(false);
            setSelectedVoice(null);

            // Load voices for new adapter
            await loadVoices();

        } catch (error) {
            console.error('Error changing adapter:', error);
            setVoicesError(`Failed to switch to ${adapter?.name || 'new adapter'}`);
        } finally {
            setIsRecreatingServices(false);
        }
    }, [selectedAdapterType, availableAdapters]);

    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async (adapterType?: AdapterType) => {
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
    };

    const handleGenerateTts = async () => {
        if (!selectedVoice) {
            setVoicesError('Please select a voice');
            return;
        }

        setIsGeneratingAudio(true);
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
            setIsGeneratingAudio(false);
        }
    };

    const handleStop = () => {
        const { orchestrationService } = getServices();
        orchestrationService.stopReading();
    };

    const handlePause = () => {
        const { orchestrationService } = getServices();
        if (isPlaying && !isPaused) {
            orchestrationService.pauseReading();
        }
    };

    const handleResume = () => {
        const { orchestrationService } = getServices();
        if (!isPlaying && isPaused) {
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
        if (isGeneratingAudio) return "Generating audio...";
        if (isPlaying) return "Playing with SOLID architecture";
        if (isPaused) return "Paused";
        return "Ready";
    };

    const formatShortcut = (shortcut: ShortcutConfig): string => {
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
            style={{
                width: "400px",
                maxHeight: "80vh",
                overflowY: "auto",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                padding: "20px",
            }}
        >
            <ThContainerHeader
                label={`Text-to-Speech - ${availableAdapters.find(a => a.key === selectedAdapterType)?.name || 'Unknown'}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
                <ThCloseButton onPress={handleClose}>
                    Close
                </ThCloseButton>
            </ThContainerHeader>

            <ThContainerBody>
                {voicesError && (
                    <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#ffebee", borderRadius: "4px" }}>
                        <p style={{ color: "#c62828", fontSize: "12px" }}>
                            Error: {voicesError}
                        </p>
                    </div>
                )}

                <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                        Status: {getStatusMessage()}
                    </p>
                </div>

                {/* TTS Provider Selection (SOLID: Open/Closed Principle) */}
                <div className="adapter-selection" style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>
                        TTS Provider:
                    </label>
                    <select
                        value={selectedAdapterType}
                        onChange={(e) => handleAdapterChange(e.target.value as AdapterType)}
                        disabled={isGeneratingAudio || isPlaying || isRecreatingingServices}
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            backgroundColor: isRecreatingingServices ? "#f5f5f5" : "#fff"
                        }}
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
                            <p style={{
                                fontSize: "12px",
                                color: "#666",
                                marginTop: "5px",
                                fontStyle: "italic"
                            }}>
                                {currentAdapter.description}
                                {currentAdapter.requiresApiKey && " (Requires API Key)"}
                            </p>
                        );
                    })()}

                    {isRecreatingingServices && (
                        <p style={{ fontSize: "12px", color: "#1976d2", marginTop: "5px" }}>
                            🔄 Switching TTS provider...
                        </p>
                    )}
                </div>

                {/* Voice Selection */}
                <div className="voice-selection" style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}>
                        Voice Selection:
                    </label>
                    {isLoadingVoices ? (
                        <span style={{ fontSize: "12px", color: "#666" }}>Loading voices...</span>
                    ) : (
                        <select
                            value={selectedVoice || ''}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            disabled={isGeneratingAudio || isPlaying}
                            style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ddd"
                            }}
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

                <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <ThActionButton
                        isDisabled={!selectedVoice || isGeneratingAudio || isPlaying}
                        onClick={handleGenerateTts}
                        style={{ backgroundColor: "#4CAF50", color: "white" }}
                    >
                        {isGeneratingAudio ? 'Generating...' : 'Start TTS'}
                    </ThActionButton>

                    <ThActionButton
                        onClick={isPaused ? handleResume : handlePause}
                        isDisabled={!isPlaying && !isPaused}
                        style={{ backgroundColor: "#FF9800", color: "white" }}
                    >
                        {isPaused ? 'Resume' : 'Pause'}
                    </ThActionButton>

                    <ThActionButton
                        onClick={handleStop}
                        isDisabled={!isPlaying && !isPaused}
                        style={{ backgroundColor: "#f44336", color: "white" }}
                    >
                        Stop
                    </ThActionButton>
                </div>

                {/* Keyboard Shortcuts Section */}
                <div style={{ marginTop: "20px", fontSize: "12px", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold" }}>
                        Keyboard Shortcuts:
                    </h4>
                    {keyboardShortcuts.map((shortcut, index) => (
                        <div key={index} style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span>{shortcut.description}:</span>
                            <code style={{ backgroundColor: "#e0e0e0", padding: "2px 4px", borderRadius: "3px" }}>
                                {formatShortcut(shortcut)}
                            </code>
                        </div>
                    ))}
                </div>
            </ThContainerBody>
        </ThPopover>
    );
};
