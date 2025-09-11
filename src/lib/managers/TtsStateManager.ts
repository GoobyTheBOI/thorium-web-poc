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

    private listeners: TtsStateListener[] = [];

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

    setEnabled(isEnabled: boolean): void {
        if (!isEnabled) {
            // When disabling TTS, stop any current playback
            this.setState({
                isEnabled,
                isPlaying: false,
                isPaused: false,
                isGenerating: false,
                error: null
            });
        } else {
            this.setState({ isEnabled });
        }
    }

    toggleEnabled(): void {
        this.setEnabled(!this.state.isEnabled);
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
