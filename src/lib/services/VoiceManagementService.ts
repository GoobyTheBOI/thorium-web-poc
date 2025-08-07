import { getVoices, IVoices } from "readium-speech";

export interface IVoiceManagementService {
    loadVoices(): Promise<IVoices[]>;
    selectVoice(voiceId: string): void;
    getSelectedVoice(): string | null;
}

export class VoiceManagementService implements IVoiceManagementService {
    private selectedVoice: string | null = null;

    async loadVoices(): Promise<IVoices[]> {
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
            }));
        } catch (error) {
            console.error('Failed to load voices:', error);
            throw error;
        }
    }

    selectVoice(voiceId: string): void {
        this.selectedVoice = voiceId;
        console.log(`Voice selected: ${voiceId}`);
    }

    getSelectedVoice(): string | null {
        return this.selectedVoice;
    }
}
