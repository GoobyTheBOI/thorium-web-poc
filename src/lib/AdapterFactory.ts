import type { IAdapterFactory, IContextualPlaybackAdapter, IAdapterConfig } from '@/preferences/types';
import { DefaultTextProcessor } from './TextProcessor';
import { ElevenLabsAdapter } from './adapters/ElevenLabsAdapter';

export class TTSAdapterFactory implements IAdapterFactory {
    private readonly textProcessor = new DefaultTextProcessor();

    createAdapter(type: 'elevenlabs' | 'web-speech', config: IAdapterConfig): IContextualPlaybackAdapter {
        switch (type) {
            case 'elevenlabs':
                // Use mock adapter for browser compatibility
                // Real ElevenLabs adapter would be used server-side
                return new ElevenLabsAdapter(config, this.textProcessor);

            case 'web-speech':
                // Future implementation
                throw new Error('Web Speech API adapter not yet implemented');

            default:
                throw new Error(`Unknown adapter type: ${type}`);
        }
    }
}
