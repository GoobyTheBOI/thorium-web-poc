import { extractErrorMessage, handleDevelopmentError } from '@/lib/utils/errorUtils';

export interface TtsState {
    isPlaying: boolean;
    isPaused: boolean;
    isGenerating: boolean;
    error: string | null;
    currentAdapter: string | null;
    isEnabled: boolean;
}

export type TtsStateListener = (state: TtsState) => void;

export class TtsStateManager {
    private state: TtsState = {
        isPlaying: false,
        isPaused: false,
        isGenerating: false,
        error: null,
        currentAdapter: null,
        isEnabled: true
    };

    private readonly listeners: TtsStateListener[] = [];

    getState(): TtsState {
        return { ...this.state };
    }

    subscribe(listener: TtsStateListener): () => void {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    setState(updates: Partial<TtsState>): void {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
    }

    setPlaying(isPlaying: boolean): void {
        this.setState({
            isPlaying,
            isPaused: isPlaying ? false : this.state.isPaused
        });
    }

    setPaused(isPaused: boolean): void {
        this.setState({
            isPaused,
            isPlaying: isPaused ? false : this.state.isPlaying
        });
    }

    setGenerating(isGenerating: boolean): void {
        this.setState({ isGenerating });
    }

    setError(error: string | null): void {
        this.setState({ error });
    }

    setAdapter(adapter: string): void {
        this.setState({ currentAdapter: adapter });
    }

    enableTts(): void {
        this.setState({ isEnabled: true });
    }

    disableTts(): void {
        // When disabling TTS, stop any current playback and clear state
        this.setState({
            isEnabled: false,
            isPlaying: false,
            isPaused: false,
            isGenerating: false,
            error: null
        });
    }

    toggleEnabled(): void {
        if (this.state.isEnabled) {
            this.disableTts();
        } else {
            this.enableTts();
        }
    }

    reset(): void {
        this.setState({
            isPlaying: false,
            isPaused: false,
            isGenerating: false,
            error: null
        });
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.getState());
            } catch (error) {
                // Silently handle listener errors to prevent disrupting other listeners
                handleDevelopmentError(error, 'TTS State Listener Error');
            }
        });
    }
}
