interface IPlaybackAdapter {
    play<T = void>(text: string): Promise<T>;
    pause(): void;
    resume(): void;
    stop(): void;
    on(event: 'wordBoundary' | 'end', callback: (info: any) => void): void;
    // getVoices(): Promise<VoiceInfo[]>;
}

interface IElevenLabsAdapter extends IPlaybackAdapter {
    // Additional methods specific to ElevenLabs can be defined here
    playWithContext<T = Buffer>(text: string, requestIds?: string[]): Promise<{ audioBuffer: Buffer; requestId: string | null }>;
}
