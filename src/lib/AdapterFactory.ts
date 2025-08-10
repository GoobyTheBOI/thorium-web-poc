import type { IAdapterFactory, IContextualPlaybackAdapter, IAdapterConfig } from '@/preferences/types';
import { DefaultTextProcessor } from './TextProcessor';
import { ElevenLabsAdapter } from './adapters/ElevenLabsAdapter';

export class TTSAdapterFactory implements IAdapterFactory {
    private readonly textProcessor = new DefaultTextProcessor();

    createAdapter(type: 'elevenlabs' | 'web-speech', config: IAdapterConfig): IContextualPlaybackAdapter {
        switch (type) {
            case 'elevenlabs':
                return new ElevenLabsAdapter(config, this.textProcessor);
            case 'web-speech':
                throw new Error('Web Speech API adapter not yet implemented');
            default:
                throw new Error(`Unknown adapter type: ${type}`);
        }
    }
}
