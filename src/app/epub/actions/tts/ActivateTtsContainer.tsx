'use client';

import { useAppSelector, useAppDispatch, RootState } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { IVoices } from "readium-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ThContainerHeader, ThPopover, ThActionButton, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { IAdapterConfig, IContextualPlaybackAdapter } from "@/preferences/types";
import { TTSAdapterFactory } from "@/lib/AdapterFactory";
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

    // Service references (SOLID: Dependency Inversion)
    const ttsServiceRef = useRef<ITtsOrchestrationService | null>(null);
    const voiceServiceRef = useRef<IVoiceManagementService | null>(null);
    const textExtractionServiceRef = useRef<ITextExtractionService | null>(null);

    const isOpen = useAppSelector((state: RootState) => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    // Service initialization with dependency injection (SOLID: DIP)
    const initializeServices = useCallback((): {
        ttsService: ITtsOrchestrationService;
        voiceService: IVoiceManagementService;
        textExtractionService: ITextExtractionService;
    } => {
        if (!ttsServiceRef.current || !voiceServiceRef.current || !textExtractionServiceRef.current) {
            // Initialize services with dependency injection
            const factory = new TTSAdapterFactory();
            const config: IAdapterConfig = {
                apiKey: process.env.ELEVENLABS_API_KEY || '',
                voiceId: 'JBFqnCBsd6RMkjVDRZzb',
                modelId: 'eleven_multilingual_v2'
            };

            const adapter: IContextualPlaybackAdapter = factory.createAdapter('elevenlabs', config);
            textExtractionServiceRef.current = new EpubTextExtractionService();
            ttsServiceRef.current = new TtsOrchestrationService(adapter, textExtractionServiceRef.current);
            voiceServiceRef.current = new VoiceManagementService();

            // Get registered shortcuts
            setKeyboardShortcuts(ttsServiceRef.current.getShortcuts());

            // Set up service event listeners (SOLID: Open/Closed)
            ttsServiceRef.current.on('play', () => {
                setIsPlaying(true);
                setIsPaused(false);
            });

            ttsServiceRef.current.on('pause', () => {
                setIsPlaying(false);
                setIsPaused(true);
            });

            ttsServiceRef.current.on('resume', () => {
                setIsPlaying(true);
                setIsPaused(false);
            });

            ttsServiceRef.current.on('stop', () => {
                setIsPlaying(false);
                setIsPaused(false);
            });

            ttsServiceRef.current.on('end', () => {
                setIsPlaying(false);
                setIsPaused(false);
            });

            ttsServiceRef.current.on('error', (info: unknown) => {
                const errorInfo = info as { error?: { message?: string } };
                setVoicesError(`TTS Error: ${errorInfo.error?.message || 'Unknown error'}`);
                setIsPlaying(false);
                setIsPaused(false);
            });
        }

        return {
            ttsService: ttsServiceRef.current!,
            voiceService: voiceServiceRef.current!,
            textExtractionService: textExtractionServiceRef.current!
        };
    }, []);

    // Load voices when component mounts (SOLID: Single Responsibility)
    useEffect(() => {
        loadVoices();
    }, []);

    const loadVoices = async () => {
        setIsLoadingVoices(true);
        setVoicesError(null);

        try {
            const { voiceService } = initializeServices();
            const voiceList = await voiceService.loadVoices();
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
            const { ttsService, textExtractionService } = initializeServices();

            // Extract text using service (SOLID: Single Responsibility)
            const chunks = await textExtractionService.extractTextChunks();

            if (chunks.length === 0) {
                setVoicesError('No text found to convert');
                return;
            }

            // Use orchestration service for TTS workflow (SOLID: SRP)
            await ttsService.startReading();

        } catch (error) {
            console.error('Error generating TTS:', error);
            setVoicesError('Failed to generate audio');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleStop = () => {
        const { ttsService } = initializeServices();
        ttsService.stopReading();
    };

    const handlePause = () => {
        const { ttsService } = initializeServices();
        if (isPlaying && !isPaused) {
            ttsService.pauseReading();
        }
    };

    const handleResume = () => {
        const { ttsService } = initializeServices();
        if (!isPlaying && isPaused) {
            ttsService.resumeReading();
        }
    };

    const cleanupTts = () => {
        try {
            const { ttsService } = initializeServices();
            ttsService.stopReading();
        } catch (error) {
            console.error('Error during TTS cleanup:', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupTts();
        };
    }, []);

    if (!isOpen) return null;

    const handleClose = () => {
        cleanupTts(); // Stop any playing audio using SOLID services
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    };

    // Status message helper (SOLID: Single Responsibility)
    const getStatusMessage = () => {
        if (isGeneratingAudio) return "Generating audio...";
        if (isPlaying) return "Playing with SOLID architecture";
        if (isPaused) return "Paused";
        return "Ready";
    };

    // Format shortcut display
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
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)"
            }}
        >
            <ThContainerHeader
                label="Text-to-Speech (SOLID Architecture)"
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

                <div style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}>
                    <p>• SOLID Design Principles: Single Responsibility, Open/Closed, Dependency Inversion</p>
                    <p>• Service-oriented architecture with proper separation of concerns</p>
                    <p>• Dependency injection for testable and maintainable code</p>
                    <p>• Keyboard shortcuts enabled globally when TTS is active</p>
                </div>
            </ThContainerBody>
        </ThPopover>
    );
};
