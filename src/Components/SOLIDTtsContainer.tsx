"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { TTSAdapterFactory } from '@/lib/AdapterFactory';
import type { IContextualPlaybackAdapter, IAdapterConfig } from '@/preferences/types';

interface TextChunk {
    text: string;
    startTime: number;
    endTime: number;
    element?: HTMLElement;
}

export const SOLIDTtsContainer: React.FC = () => {
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

    const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const adapterRef = useRef<IContextualPlaybackAdapter | null>(null);

    // Sample text to test with
    const sampleText = `Preface

When a writer calls his work a Romance, it need hardly be observed that he wishes to claim a certain latitude, both as to its fashion and material, which he would not have felt himself entitled to assume had he professed to be writing a Novel. The latter form of composition is presumed to aim at a very minute fidelity, not merely to the possible, but to the probable and ordinary course of man's experience.`;

    // Initialize adapter with factory - memoized to prevent re-creation
    const getAdapter = useCallback((): IContextualPlaybackAdapter => {
        if (!adapterRef.current) {
            const factory = new TTSAdapterFactory();
            const config: IAdapterConfig = {
                apiKey: 'demo-key', // Mock key for demo
                voiceId: 'JBFqnCBsd6RMkjVDRZzb',
                modelId: 'eleven_multilingual_v2'
            };

            adapterRef.current = factory.createAdapter('elevenlabs', config);
        }

        return adapterRef.current;
    }, []);

    // Create mock text chunks for testing
    const createTextChunks = useCallback((text: string): TextChunk[] => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks: TextChunk[] = [];
        let currentTime = 0;

        sentences.forEach((sentence) => {
            const cleanText = sentence.trim();
            if (cleanText.length > 0) {
                const wordCount = cleanText.split(/\s+/).length;
                const duration = (wordCount / 150) * 60; // 150 words per minute

                chunks.push({
                    text: cleanText + '.',
                    startTime: currentTime,
                    endTime: currentTime + duration,
                    element: undefined
                });

                currentTime += duration;
            }
        });

        return chunks;
    }, []);

    // Create test text display
    const createTestTextDisplay = useCallback((chunks: TextChunk[]) => {
        const existingDisplay = document.getElementById('solid-tts-test-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        const testDisplay = document.createElement('div');
        testDisplay.id = 'solid-tts-test-display';
        testDisplay.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 400px;
            max-height: 400px;
            background: white;
            border: 2px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
        `;

        const title = document.createElement('h3');
        title.textContent = 'SOLID TTS Test Display';
        title.style.cssText = 'margin: 0 0 15px 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;';
        testDisplay.appendChild(title);

        chunks.forEach((chunk, index) => {
            const chunkElement = document.createElement('span');
            chunkElement.textContent = chunk.text;
            chunkElement.id = `solid-test-chunk-${index}`;
            chunkElement.style.cssText = `
                display: inline;
                padding: 2px 4px;
                margin: 2px;
                border-radius: 3px;
                transition: all 0.3s ease;
                cursor: pointer;
            `;

            chunk.element = chunkElement as HTMLElement;
            testDisplay.appendChild(chunkElement);

            if (index < chunks.length - 1) {
                testDisplay.appendChild(document.createTextNode(' '));
            }
        });

        const closeButton = document.createElement('button');
        closeButton.textContent = '✖ Close';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            font-size: 12px;
        `;
        closeButton.onclick = () => testDisplay.remove();
        testDisplay.appendChild(closeButton);

        document.body.appendChild(testDisplay);
    }, []);

    // Highlighting functions
    const highlightCurrentChunk = useCallback((chunkIndex: number) => {
        // Clear previous highlights
        textChunks.forEach(chunk => {
            if (chunk.element) {
                chunk.element.style.backgroundColor = '';
                chunk.element.style.color = '';
                chunk.element.style.fontWeight = '';
                chunk.element.style.transition = '';
            }
        });

        if (chunkIndex >= 0 && chunkIndex < textChunks.length) {
            const chunk = textChunks[chunkIndex];
            if (chunk.element) {
                chunk.element.style.backgroundColor = '#ffff00';
                chunk.element.style.color = '#000000';
                chunk.element.style.fontWeight = 'bold';
                chunk.element.style.transition = 'all 0.3s ease';
            }
        }
    }, [textChunks]);

    const clearHighlights = useCallback(() => {
        textChunks.forEach(chunk => {
            if (chunk.element) {
                chunk.element.style.backgroundColor = '';
                chunk.element.style.color = '';
                chunk.element.style.fontWeight = '';
                chunk.element.style.transition = '';
            }
        });
    }, [textChunks]);

    // Audio playback with highlighting
    const startAudioWithHighlighting = useCallback((audioBlob: Blob, chunks: TextChunk[]) => {
        try {
            // Cleanup any existing audio
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.src = '';
                currentAudio.load();
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio();

            // Set up audio error handling
            audio.addEventListener('error', (e: Event) => {
                console.error('Audio error:', e);
                setError('Audio playback failed');
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            });

            audio.addEventListener('ended', () => {
                console.log('Audio playback ended');
                setIsPlaying(false);
                setCurrentChunkIndex(-1);
                clearHighlights();
                if (highlightIntervalRef.current) {
                    clearInterval(highlightIntervalRef.current);
                    highlightIntervalRef.current = null;
                }
                URL.revokeObjectURL(audioUrl);

                setTimeout(() => {
                    const testDisplay = document.getElementById('solid-tts-test-display');
                    if (testDisplay) testDisplay.remove();
                }, 3000);
            });

            // Set audio source but don't play yet
            audio.src = audioUrl;
            setCurrentAudio(audio);
            setTextChunks(chunks);

            // Return the audio element so it can be played in the user interaction handler
            return audio;

        } catch (error) {
            console.error('Audio setup error:', error);
            setError('Failed to setup audio playback');
            setIsPlaying(false);
            return null;
        }
    }, [currentAudio, clearHighlights]);

    // Start audio playback - must be called from user interaction
    const startAudioPlayback = useCallback((audio: HTMLAudioElement, chunks: TextChunk[]) => {
        setIsPlaying(true);

        // Start highlighting interval
        highlightIntervalRef.current = setInterval(() => {
            if (audio.paused || audio.ended || audio.currentTime === 0) return;

            const currentTime = audio.currentTime;
            const chunkIndex = chunks.findIndex(chunk =>
                currentTime >= chunk.startTime && currentTime <= chunk.endTime
            );

            if (chunkIndex !== currentChunkIndex && chunkIndex >= 0) {
                setCurrentChunkIndex(chunkIndex);
                highlightCurrentChunk(chunkIndex);
            }
        }, 200);

        // Play the audio - this MUST be in user interaction context
        audio.play().catch((error: Error) => {
            console.error('Audio play failed:', error);
            setError('Failed to start audio playback');
            setIsPlaying(false);
        });
    }, [currentChunkIndex, highlightCurrentChunk]);

    // Main TTS handler - using SOLID factory pattern
    const handleStartTts = useCallback(async () => {
        try {
            setIsGeneratingAudio(true);
            setError(null);

            const adapter = getAdapter();
            const chunks = createTextChunks(sampleText);

            console.log("Using SOLID TTS architecture with MockTtsAdapter");
            console.log("Text chunks:", chunks.length);

            // Generate audio using the adapter
            const audioBuffer = await adapter.play<Buffer>(sampleText);
            const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/wav' });

            createTestTextDisplay(chunks);

            // Setup audio but don't play yet
            const audio = startAudioWithHighlighting(audioBlob, chunks);

            if (audio) {
                // Now play the audio - this is still in the user interaction context
                startAudioPlayback(audio, chunks);
            }

        } catch (error) {
            console.error('SOLID TTS error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setError(`Failed to generate audio: ${errorMessage}`);
        } finally {
            setIsGeneratingAudio(false);
        }
    }, [getAdapter, createTextChunks, createTestTextDisplay, startAudioWithHighlighting, startAudioPlayback, sampleText]);

    const handleStopTts = useCallback(() => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            currentAudio.load();
        }

        setIsPlaying(false);
        setCurrentChunkIndex(-1);
        clearHighlights();

        if (highlightIntervalRef.current) {
            clearInterval(highlightIntervalRef.current);
            highlightIntervalRef.current = null;
        }

        const testDisplay = document.getElementById('solid-tts-test-display');
        if (testDisplay) testDisplay.remove();
    }, [currentAudio, clearHighlights]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            handleStopTts();
        };
    }, [handleStopTts]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 9999,
            minWidth: '300px'
        }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
                SOLID TTS Architecture Demo
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '14px', margin: '5px 0' }}>
                    Status: {isGeneratingAudio ? "Generating..." : isPlaying ? "Playing with highlights" : "Ready"}
                </p>

                {textChunks.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                        Chunks: {textChunks.length} | Current: {currentChunkIndex + 1}
                    </p>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    disabled={isGeneratingAudio || isPlaying}
                    onClick={handleStartTts}
                    style={{
                        backgroundColor: isGeneratingAudio || isPlaying ? '#ccc' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: isGeneratingAudio || isPlaying ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isGeneratingAudio ? "Generating..." : "Start SOLID TTS"}
                </button>

                <button
                    disabled={!currentAudio}
                    onClick={handleStopTts}
                    style={{
                        backgroundColor: !currentAudio ? '#ccc' : '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: !currentAudio ? 'not-allowed' : 'pointer'
                    }}
                >
                    Stop
                </button>
            </div>

            {error && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: '#ffebee',
                    borderRadius: '4px',
                    border: '1px solid #f44336'
                }}>
                    <p style={{ color: '#c62828', fontSize: '12px', margin: 0 }}>
                        Error: {error}
                    </p>
                </div>
            )}

            <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
                <p style={{ margin: '2px 0' }}>• SOLID architecture with Factory Pattern</p>
                <p style={{ margin: '2px 0' }}>• Mock TTS adapter for browser compatibility</p>
                <p style={{ margin: '2px 0' }}>• Real-time text highlighting</p>
                <p style={{ margin: '2px 0' }}>• Dependency injection & interface segregation</p>
            </div>
        </div>
    );
};
