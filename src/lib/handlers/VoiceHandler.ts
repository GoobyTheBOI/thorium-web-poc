import { IPlaybackAdapter, VoiceInfo } from '@/preferences/types';
import { extractErrorMessage, handleDevelopmentError } from '@/lib/utils/errorUtils';

export interface VoiceChangeCallback {
    onVoiceChanged?: (voiceId: string, voiceInfo?: VoiceInfo) => void;
    onVoiceError?: (error: string, voiceId: string) => void;
    onVoicesLoaded?: (voices: VoiceInfo[]) => void;
}

export interface VoiceHandlerConfig {
    adapter: IPlaybackAdapter;
    callbacks?: VoiceChangeCallback;
}

/**
 * SOLID: Single Responsibility - Handles all voice-related operations
 * Follows the same pattern as KeyboardHandler.ts
 */
export class VoiceHandler {
    private adapter: IPlaybackAdapter;
    private callbacks: VoiceChangeCallback;
    private currentVoices: VoiceInfo[] = [];
    private currentVoiceId: string | null = null;

    constructor(config: VoiceHandlerConfig) {
        this.adapter = config.adapter;
        this.callbacks = config.callbacks || {};
    }

    /**
     * Load available voices from the adapter
     */
    async loadVoices(): Promise<VoiceInfo[]> {
        try {
            const voices = await this.adapter.voices?.getVoices();
            if (!voices) {
                throw new Error('No voices available from adapter');
            }

            this.currentVoices = voices;
            this.callbacks.onVoicesLoaded?.(voices);

            // Auto-select first voice if none selected
            if (!this.currentVoiceId && voices.length > 0) {
                await this.setVoice(voices[0].id);
            }

            return voices;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load voices';
            this.callbacks.onVoiceError?.(errorMessage, 'unknown');
            throw error;
        }
    }

    /**
     * Set the active voice
     */
    async setVoice(voiceId: string): Promise<void> {
        try {
            if (!this.adapter.voices?.setVoice) {
                throw new Error('Voice setting not supported by current adapter');
            }

            await this.adapter.voices.setVoice(voiceId);
            this.currentVoiceId = voiceId;

            // Find voice info for callback
            const voiceInfo = this.currentVoices.find(v => v.id === voiceId);

            this.callbacks.onVoiceChanged?.(voiceId, voiceInfo);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to set voice';
            this.callbacks.onVoiceError?.(errorMessage, voiceId);
            throw error;
        }
    }

    /**
     * Get voices filtered by gender
     */
    async getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]> {
        try {
            if (this.adapter.voices?.getVoicesByGender) {
                return await this.adapter.voices.getVoicesByGender(gender);
            }

            // Fallback: filter from loaded voices
            return this.currentVoices.filter(voice => voice.gender === gender);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Failed to get ${gender} voices`;
            this.callbacks.onVoiceError?.(errorMessage, 'filter');
            throw error;
        }
    }

    /**
     * Get current voice gender
     */
    async getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null> {
        try {
            if (this.adapter.voices?.getCurrentVoiceGender) {
                return await this.adapter.voices.getCurrentVoiceGender();
            }

            // Fallback: find from loaded voices
            if (this.currentVoiceId) {
                const currentVoice = this.currentVoices.find(v => v.id === this.currentVoiceId);
                return currentVoice?.gender || null;
            }

            return null;
        } catch (error) {
            // Silently handle voice gender retrieval errors
            handleDevelopmentError(error, 'Voice Handler Gender Error');
            return null;
        }
    }

    /**
     * Get all loaded voices
     */
    getLoadedVoices(): VoiceInfo[] {
        return [...this.currentVoices];
    }

    /**
     * Get current voice ID
     */
    getCurrentVoiceId(): string | null {
        return this.currentVoiceId;
    }

    /**
     * Get current voice info
     */
    getCurrentVoiceInfo(): VoiceInfo | null {
        if (!this.currentVoiceId) return null;
        return this.currentVoices.find(v => v.id === this.currentVoiceId) || null;
    }

    /**
     * Update the adapter (when switching TTS providers)
     */
    updateAdapter(newAdapter: IPlaybackAdapter): void {
        this.adapter = newAdapter;
        this.currentVoices = [];
        this.currentVoiceId = null;
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.currentVoices = [];
        this.currentVoiceId = null;
        // Clear callbacks to prevent memory leaks
        this.callbacks = {};
    }
}

export default VoiceHandler;
