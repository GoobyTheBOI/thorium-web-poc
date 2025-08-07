"use client";

import { useAppSelector, useAppDispatch } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { getVoices, IVoices  } from "readium-speech";
import React, { useEffect, useRef, useState } from "react";
import { ThContainerHeader, ThPopover, ThActionButton, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";
import { TextChunk, TTS_CONSTANTS, IFRAME_SELECTORS } from "@/types/tts";

export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();
    const [voices, setVoices] = useState<IVoices[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [voicesError, setVoicesError] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [textChunks, setTextChunks] = useState<TextChunk[]>([]);
    const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);

    const highlightIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const readerIframeRef = useRef<HTMLIFrameElement | null>(null);

    const isOpen = useAppSelector(state => {
        return state.actions?.keys?.[TtsActionKeys.activateTts]?.isOpen || false;
    });

    const getCurrentReaderIframe = (): HTMLIFrameElement | null => {
        for (const selector of IFRAME_SELECTORS) {
            const iframes = document.querySelectorAll(selector) as NodeListOf<HTMLIFrameElement>;

            for (const iframe of iframes) {
                try {
                    const style = window.getComputedStyle(iframe);
                    const isVisible = style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        style.opacity !== '0';

                    if (isVisible && iframe.contentDocument) {
                        return iframe;
                    }
                } catch (error) {
                    console.debug('Cannot access iframe:', error instanceof Error ? error.message : String(error));
                    continue;
                }
            }
        }

        console.warn('No accessible iframe found');
        return null;
    };


    // Function to extract text from current EPUB position
    const getCurrentEpubTextWithElements = async (): Promise<{ text: string; chunks: TextChunk[] }> => {
        try {
            const iframe = getCurrentReaderIframe();
            readerIframeRef.current = iframe;


            if (!iframe?.contentDocument) {
                throw new Error('Cannot access reader content');
            }

            const doc = iframe.contentDocument;
            const textNodes = getAllTextNodes(doc.body);
            const chunks: TextChunk[] = [];
            let fullText = '';

            textNodes.forEach((node, index) => {
                const text = node.textContent?.trim();
                if (text && text.length > 0) {
                    // Estimate reading time (average 150 words per minute)
                    const wordCount = text.split(/\s+/).length;

                    chunks.push({
                        text: text,
                        element: node.parentElement || undefined,
                    });

                    fullText += text + ' ';
                }
            });

            return { text: fullText.trim(), chunks };
        } catch (error) {
            console.error('Error extracting text with elements:', error);
            const fallbackText = await extractTextFromCurrentView();
            return {
                text: fallbackText,
                chunks: [{
                    text: fallbackText,
                    element: undefined,
                }]
            };
        }
    };

    const getAllTextNodes = (element: Element): Node[] => {
        const textNodes: Node[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim();
                    return text && text.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    };

    const extractTextFromCurrentView = async (): Promise<string> => {
        try {
            const readerIframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;

            if (readerIframe && readerIframe.contentDocument) {
                const textContent = readerIframe.contentDocument.body.innerText;

                if (!textContent || textContent.trim().length === 0) {
                    return "No text content found in current view.";
                }

                const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
                let result = '';
                for (const sentence of sentences) {
                    if ((result + sentence).length > 1000) break;
                    result += sentence.trim() + '. ';
                }

                return result.trim() || "No readable text found.";
            }

            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                return selection.toString().trim();
            }

            return "Unable to extract text from current position.";
        } catch (error) {
            console.error('Error extracting text from view:', error);
            return "Error extracting text from current view.";
        }
    };

    const clearHighlights = () => {
        console.log("Clearing highlights for", textChunks.length, "chunks");

        if (!readerIframeRef.current?.contentDocument) {
            console.log("No iframe content document for clearing highlights");
            return;
        }

        textChunks.forEach((chunk, index) => {
            if (chunk.element) {
                const elementExists = readerIframeRef.current!.contentDocument!.contains(chunk.element);

                if (elementExists) {
                    chunk.element.style.removeProperty('background-color');
                    chunk.element.style.removeProperty('color');
                    chunk.element.style.removeProperty('transition');
                    chunk.element.style.removeProperty('border');
                }
            }
        });
    };

    const handleStartTts = async () => {
        try {
            setIsGeneratingAudio(true);
            setVoicesError(null);

            // Extract text with element mapping
            const { text: epubText, chunks } = await getCurrentEpubTextWithElements();
            console.log("Text chunks:", chunks);

            const chunksToSend = chunks.slice(0, TTS_CONSTANTS.CHUNK_SIZE_FOR_TESTING).map(chunk => ({
                text: chunk.text,
                element: chunk.element?.tagName
            }));

            console.log("Chunks to send:", chunksToSend);

            // Generate audio using ElevenLabs API
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: chunksToSend,
                    voiceId: TTS_CONSTANTS.VOICE_ID,
                    useContext: true
                }),
            });

            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status} ${response.statusText}`);
            }

            console.log("Audio response received, starting playback...");
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Set up audio event listeners
            audio.addEventListener('ended', () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            });

            audio.addEventListener('error', (error) => {
                console.error('Audio playback error:', error);
                setVoicesError('Audio playback failed');
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            });

            setCurrentAudio(audio);
            setTextChunks(chunks);
            setIsPlaying(true);

            await audio.play();
        } catch (error) {
            console.error('TTS error:', error);
            setVoicesError(`Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleStopTts = () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        setIsPlaying(false);
        setCurrentChunkIndex(-1);
        clearHighlights();

        if (highlightIntervalRef.current) {
            clearInterval(highlightIntervalRef.current);
        }
    };

    const handlePauseTts = () => {
        if (currentAudio) {
            if (currentAudio.paused) {
                currentAudio.play();
                setIsPlaying(true);
            } else {
                currentAudio.pause();
                setIsPlaying(false);
            }
        }
    };

    // Cleanup effect
    useEffect(() => {
        return () => {
            // Clear any active intervals
            if (highlightIntervalRef.current) {
                clearInterval(highlightIntervalRef.current);
                highlightIntervalRef.current = null;
            }

            // Stop and cleanup audio
            if (currentAudio) {
                currentAudio.pause();
            }

            // Clear visual highlights
            clearHighlights();
        };
    }, [currentAudio, textChunks]);

    // Voices fetching effect
    useEffect(() => {
        if (!isOpen) return;

        const fetchVoices = async () => {
            try {
                setIsLoadingVoices(true);
                setVoicesError(null);

                const voicesData = await getVoices();
                const mappedVoices: IVoices[] = voicesData.map((voice: IVoices) => ({
                    name: voice.name,
                    label: voice.label,
                    language: voice.language,
                    offlineAvailability: voice.offlineAvailability,
                    pitchControl: voice.pitchControl,
                    voiceURI: voice.voiceURI,
                    age: voice.age,
                }));

                setVoices(mappedVoices);
            } catch (error) {
                console.error("Error fetching voices:", error);
                setVoicesError("Failed to load voices");
                setVoices([]);
            } finally {
                setIsLoadingVoices(false);
            }
        };

        fetchVoices();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        handleStopTts(); // Stop any playing audio
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.activateTts,
                isOpen: false
            }
        });
    };

    // Status message helper
    const getStatusMessage = () => {
        if (isGeneratingAudio) return "Generating audio...";
        if (isPlaying) return "Playing with highlights";
        return "Ready";
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
            <ThContainerHeader label="Text-to-Speech Reader" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <ThCloseButton onPress={handleClose}>
                    Close
                </ThCloseButton>
            </ThContainerHeader>
            <ThContainerBody>
                <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "14px", marginBottom: "10px" }}>
                        Status: {getStatusMessage()}
                    </p>

                    {textChunks.length > 0 && (
                        <p style={{ fontSize: "12px", color: "#666" }}>
                            Text chunks: {textChunks.length} | Current: {currentChunkIndex + 1}
                        </p>
                    )}
                </div>

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <ThActionButton
                    isDisabled={isGeneratingAudio || isPlaying}
                    onClick={handleStartTts}
                    style={{ backgroundColor: "#4CAF50", color: "white" }}
                >
                    {isGeneratingAudio ? "Generating..." : "Start Reading"}
                </ThActionButton>

                <ThActionButton
                    isDisabled={!isPlaying && !currentAudio}
                    onClick={handlePauseTts}
                    style={{ backgroundColor: "#FF9800", color: "white" }}
                >
                    {currentAudio?.paused ? "Resume" : "Pause"}
                </ThActionButton>

                <ThActionButton
                    isDisabled={!currentAudio}
                    onClick={handleStopTts}
                    style={{ backgroundColor: "#f44336", color: "white" }}
                >
                    Stop
                </ThActionButton>
            </div>

            {voicesError && (
                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#ffebee", borderRadius: "4px" }}>
                    <p style={{ color: "#c62828", fontSize: "12px" }}>
                        Error: {voicesError}
                    </p>
                </div>
            )}

            <div style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}>
                <p>• Text will be highlighted as it's being read</p>
                <p>• Audio generated with ElevenLabs TTS</p>
                <p>• Current text chunk will be auto-scrolled into view</p>
            </div>
            </ThContainerBody>
        </ThPopover>
    );
};

