import { handleDevelopmentError } from '@/lib/utils/errorUtils';

export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    action: () => void;
    description: string;
}

export class KeyboardHandler {
    private readonly shortcuts: Map<string, KeyboardShortcut> = new Map();
    private boundHandler: ((event: KeyboardEvent) => void) | null = null;
    private enabled: boolean = true;

    register(shortcuts: KeyboardShortcut[]): void {
        this.cleanup();

        shortcuts.forEach(shortcut => {
            const key = this.createKey(shortcut);
            this.shortcuts.set(key, shortcut);
        });

        this.boundHandler = this.handleKeydown.bind(this);
        document.addEventListener('keydown', this.boundHandler);
    }

    cleanup(): void {
        if (this.boundHandler) {
            document.removeEventListener('keydown', this.boundHandler);
            this.boundHandler = null;
        }
        this.shortcuts.clear();
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    getShortcuts(): KeyboardShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    private createKey(shortcut: KeyboardShortcut): string {
        const parts: string[] = [];
        if (shortcut.ctrlKey) parts.push('ctrl');
        if (shortcut.altKey) parts.push('alt');
        if (shortcut.shiftKey) parts.push('shift');
        parts.push(shortcut.key.toLowerCase());
        return parts.join('+');
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (!this.enabled || this.isInputElement(event.target as Element)) {
            return;
        }

        const key = this.createKey({
            key: event.key,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            action: () => {},
            description: ''
        });

        const shortcut = this.shortcuts.get(key);
        if (shortcut) {
            event.preventDefault();
            event.stopPropagation();

            try {
                shortcut.action();
            } catch (error) {
                // Silently handle shortcut execution errors
                handleDevelopmentError(error, `Keyboard Shortcut Error (${key})`);
            }
        }
    }

    private isInputElement(element: Element | null): boolean {
        if (!element) return false;

        const tagName = element.tagName.toLowerCase();
        return ['input', 'textarea', 'select'].includes(tagName) ||
               element.getAttribute('contenteditable') === 'true';
    }
}
