"use client";

import { useAppSelector, useAppDispatch } from "@edrlab/thorium-web/epub";
import { TtsActionKeys } from "../../keys";
import { getVoices, IVoices  } from "readium-speech";
import React, { useEffect, useState } from "react";
import { ThContainerHeader, ThPopover, ThActionButton, ThCloseButton, ThContainerBody } from "@edrlab/thorium-web/core/components";
import { StatefulActionContainerProps } from "@edrlab/thorium-web/epub";


export const ActivateTtsContainer: React.FC<StatefulActionContainerProps> = (props) => {
    const dispatch = useAppDispatch();
    const [voices, setVoices] = useState<IVoices[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [voicesError, setVoicesError] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
    const isOpen = useAppSelector(state => {
        return state.actions?.keys?.[TtsActionKeys.ACTIVATE_TTS]?.isOpen || false;
    });

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
                setIsLoadingVoices(false);
                console.error("Error fetching voices:", error);
                setVoicesError("Failed to load voices");
                setVoices([]);
            } finally {
                setIsLoadingVoices(false);
            }
        };

        if (isOpen) fetchVoices();

    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        dispatch({
            type: "actions/setActionOpen",
            payload: {
                key: TtsActionKeys.ACTIVATE_TTS,
                isOpen: false
            }
        });
    };

    const handleStartTts = () => {
        const voice = voices.find(voice => voice.name === selectedVoice);
        const language = voice?.language || "en-US";
        const speechSyntheser = new SpeechSynthesisUtterance();

        speechSyntheser.voice = window.speechSynthesis.getVoices().find(v => v.name === voice?.name) || null;
        speechSyntheser.text = "This is a test of the Text-to-Speech functionality.";
        speechSyntheser.lang = language;
        speechSynthesis.speak(speechSyntheser);
    };

    return (
        <ThPopover
            triggerRef={props.triggerRef}
            isOpen={isOpen}
            onOpenChange={handleClose}
            key={`${TtsActionKeys.ACTIVATE_TTS}`}
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
            <ThContainerHeader label="Voice Selection" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <ThCloseButton
                    onPress={handleClose}
                >
                    Close
                </ThCloseButton>
            </ThContainerHeader>
            <ThContainerBody>
                {isLoadingVoices ? (
                    <p>Loading available voices...</p>
                ) : voicesError ? (
                    <p style={{ color: "red" }}>Error: {voicesError}</p>
                ) : (
                    <select
                        value={selectedVoice || ""}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
                    >
                        <option value="" disabled>Select a voice</option>
                        {voices.map((voice, index) => (
                            <option key={index} value={voice.name}>
                                {voice.name} {voice.language ? `(${voice.language})` : ""}
                            </option>
                        ))}
                    </select>
                )}

                <div style={{ marginTop: "20px" }}>
                    <ThActionButton
                        isDisabled={isLoadingVoices || !selectedVoice || voices.length === 0}
                        onClick={handleStartTts}
                        style={{ marginRight: "10px" }}
                    >
                        Start Reading
                    </ThActionButton>

                </div>

                <div style={{ marginTop: "15px", fontSize: "12px", color: "#666" }}>
                    <p>Note: Web Speech API support required</p>
                    <p>
                        <a
                            href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Learn more about Web Speech API
                        </a>
                    </p>
                </div>
            </ThContainerBody>
        </ThPopover>
    );
};
