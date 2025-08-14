import type { IAdapterFactory, IAdapterConfig, IPlaybackAdapter } from '@/preferences/types';
import { DefaultTextProcessor } from './TextProcessor';
import { ElevenLabsAdapter } from './adapters/ElevenLabsAdapter';
import { AzureAdapter } from './adapters/AzureAdapter';

export type AdapterType = 'elevenlabs' | 'azure' | 'web-speech';

export interface AdapterOption {
    key: AdapterType;
    name: string;
    description: string;
    isImplemented: boolean;
    requiresApiKey: boolean;
}

export class TTSAdapterFactory implements IAdapterFactory {
    private readonly textProcessor = new DefaultTextProcessor();

    static readonly AVAILABLE_ADAPTERS: AdapterOption[] = [
        {
            key: 'elevenlabs',
            name: 'ElevenLabs',
            description: 'High-quality AI voice synthesis with contextual understanding',
            isImplemented: true,
            requiresApiKey: true
        },
        {
            key: 'azure',
            name: 'Microsoft Azure TTS',
            description: 'Microsoft Azure Text-to-Speech service (Coming Soon)',
            isImplemented: true,
            requiresApiKey: true
        },
        {
            key: 'web-speech',
            name: 'Web Speech API',
            description: 'Browser native text-to-speech (Coming Soon)',
            isImplemented: false,
            requiresApiKey: false
        }
    ];

    static getAvailableAdapters(): AdapterOption[] {
        return TTSAdapterFactory.AVAILABLE_ADAPTERS;
    }

    static getImplementedAdapters(): AdapterOption[] {
        return TTSAdapterFactory.AVAILABLE_ADAPTERS.filter(adapter => adapter.isImplemented);
    }

    createAdapter(type: AdapterType, config: IAdapterConfig): IPlaybackAdapter {
        switch (type) {
            case 'elevenlabs':
                return new ElevenLabsAdapter(config, this.textProcessor);
            case 'azure':
                return new AzureAdapter(config, this.textProcessor);
            case 'web-speech':
                throw new Error('Web Speech API adapter not yet implemented');
            default:
                throw new Error(`Unknown adapter type: ${type}`);
        }
    }
}
