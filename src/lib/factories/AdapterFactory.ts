import type { IPlaybackAdapter } from '@/preferences/types';
import { DefaultTextProcessor, ElevenLabsTextProcessor } from '../TextProcessor';
import { ElevenLabsAdapter } from '../adapters/ElevenLabsAdapter';
import { AzureAdapter } from '../adapters/AzureAdapter';
import { VoiceManagementService } from '../services/VoiceManagementService';

export type AdapterType = 'elevenlabs' | 'azure';

export interface AdapterInfo {
    key: AdapterType;
    name: string;
    isImplemented: boolean;
}

export const AVAILABLE_ADAPTERS: AdapterInfo[] = [
    { key: 'elevenlabs', name: 'ElevenLabs', isImplemented: true },
    { key: 'azure', name: 'Azure TTS', isImplemented: true },
];

export function createAdapter(type: AdapterType, voiceService: VoiceManagementService): IPlaybackAdapter {
    switch (type) {
        case 'elevenlabs':
            // Use ElevenLabs-specific text processor for better intonation
            const elevenLabsTextProcessor = new ElevenLabsTextProcessor();
            return new ElevenLabsAdapter(elevenLabsTextProcessor, voiceService);
        case 'azure':
            // Use default SSML processor for Azure (supports SSML natively)
            const azureTextProcessor = new DefaultTextProcessor();
            return new AzureAdapter(azureTextProcessor, voiceService);
        default:
            throw new Error(`Unknown adapter type: ${type}`);
    }
}
