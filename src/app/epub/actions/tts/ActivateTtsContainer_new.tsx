'use client';

import { useAppSelector, useAppDispatch } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { IVoices } from "readium-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

    // Service references (SOLID: Dependency Inversion)
    const ttsServiceRef = useRef<ITtsOrchestrationService | null>(null);
    const voiceServiceRef = useRef<IVoiceManagementService | null>(null);
    const textExtractionServiceRef = useRef<ITextExtractionService | null>(null);

    const isOpen = useAppSelector(state => {
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

            ttsServiceRef.current.on('error', (info) => {
                setVoicesError(`TTS Error: ${info.error?.message || 'Unknown error'}`);
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

    return (
        <div className="tts-container">
            <h3>Text-to-Speech (SOLID Architecture)</h3>

            {voicesError && (
                <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                    {voicesError}
                </div>
            )}

            <div className="voice-selection" style={{ marginBottom: '10px' }}>
                <label>Voice: </label>
                {isLoadingVoices ? (
                    <span>Loading voices...</span>
                ) : (
                    <select
                        value={selectedVoice || ''}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        disabled={isGeneratingAudio || isPlaying}
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

            <div className="tts-controls" style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={handleGenerateTts}
                    disabled={!selectedVoice || isGeneratingAudio || isPlaying}
                >
                    {isGeneratingAudio ? 'Generating...' : 'Start TTS'}
                </button>

                <button
                    onClick={isPaused ? handleResume : handlePause}
                    disabled={!isPlaying && !isPaused}
                >
                    {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                    onClick={handleStop}
                    disabled={!isPlaying && !isPaused}
                >
                    Stop
                </button>
            </div>

            <div className="status" style={{ marginTop: '10px' }}>
                {isPlaying && <span style={{ color: 'green' }}>🔊 Playing</span>}
                {isPaused && <span style={{ color: 'orange' }}>⏸️ Paused</span>}
                {!isPlaying && !isPaused && <span style={{ color: 'gray' }}>⏹️ Stopped</span>}
            </div>
        </div>
    );
};
