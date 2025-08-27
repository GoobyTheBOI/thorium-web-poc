import { getVoices, IVoices } from "readium-speech";
import { VoiceInfo } from "@/preferences/types";

export interface IVoiceManagementService {
    loadRediumVoices(): Promise<IVoices[]>;
    loadElevenLabsVoices(): Promise<VoiceInfo[]>;
    loadAzureVoices(): Promise<VoiceInfo[]>;
    selectVoice(voiceId: string): void;
    getSelectedVoice(): string | null;
    getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]>;
    getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null>;
}

export class VoiceManagementService implements IVoiceManagementService {
    private selectedVoice: string | null = null;
    private elevenLabsVoices: VoiceInfo[] = [];
    private azureVoices: VoiceInfo[] = [];

    async loadRediumVoices(): Promise<IVoices[]> {
        try {
            const voicesData = await getVoices();
            return voicesData.map((voice: IVoices) => ({
                name: voice.name,
                label: voice.label,
                language: voice.language,
                offlineAvailability: voice.offlineAvailability,
                pitchControl: voice.pitchControl,
                voiceURI: voice.voiceURI,
                age: voice.age,
                gender: voice.gender
            }));
        } catch (error) {
            console.error('Failed to load voices:', error);
            throw error;
        }
    }

    async loadElevenLabsVoices(): Promise<VoiceInfo[]> {
        try {
            const response = await fetch('/api/tts/elevenlabs/voices');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch voices');
            }

            this.elevenLabsVoices = data.voices;
            return this.elevenLabsVoices;
        } catch (error) {
            console.error('Failed to load ElevenLabs voices:', error);
            throw error;
        }
    }

    async loadAzureVoices(): Promise<VoiceInfo[]> {
        try {
            const response = await fetch('/api/tts/azure/voices');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch Azure voices');
            }

            this.azureVoices = data;
            return this.azureVoices;
        } catch (error) {
            console.error('Failed to load Azure voices:', error);
            throw error;
        }
    }

    async getVoicesByGender(gender: 'male' | 'female'): Promise<VoiceInfo[]> {
        // Combine both ElevenLabs and Azure voices
        if (this.elevenLabsVoices.length === 0) {
            await this.loadElevenLabsVoices();
        }
        if (this.azureVoices.length === 0) {
            await this.loadAzureVoices();
        }

        const allVoices = [...this.elevenLabsVoices, ...this.azureVoices];
        return allVoices.filter(voice => voice.gender === gender);
    }

    async getCurrentVoiceGender(): Promise<'male' | 'female' | 'neutral' | null> {
        if (!this.selectedVoice) {
            return null;
        }

        // Check both ElevenLabs and Azure voices
        if (this.elevenLabsVoices.length === 0) {
            await this.loadElevenLabsVoices();
        }
        if (this.azureVoices.length === 0) {
            await this.loadAzureVoices();
        }

        const allVoices = [...this.elevenLabsVoices, ...this.azureVoices];
        const voice = allVoices.find(v => v.id === this.selectedVoice);
        return voice?.gender || null;
    }

    selectVoice(voiceId: string): void {
        this.selectedVoice = voiceId;
        console.log(`Voice selected: ${voiceId}`);
    }

    getSelectedVoice(): string | null {
        return this.selectedVoice;
    }
}
