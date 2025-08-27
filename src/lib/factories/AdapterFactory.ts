import type { IPlaybackAdapter } from '@/preferences/types';
import { DefaultTextProcessor } from '../TextProcessor';
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
    { key: 'azure', name: 'Azure TTS', isImplemented: true }
];

export function createAdapter(type: AdapterType, voiceService: VoiceManagementService): IPlaybackAdapter {
    const textProcessor = new DefaultTextProcessor();

    switch (type) {
        case 'elevenlabs':
            return new ElevenLabsAdapter(textProcessor, voiceService);
        case 'azure':
            return new AzureAdapter(textProcessor, voiceService);
        default:
            throw new Error(`Unknown adapter type: ${type}`);
    }
}
