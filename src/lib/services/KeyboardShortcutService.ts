export interface IKeyboardShortcutService {
    registerShortcuts(shortcuts: ShortcutConfig[]): void;
    unregisterShortcuts(): void;
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    getRegisteredShortcuts(): ShortcutConfig[];
}

export interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    action: () => void;
    description: string;
    category: 'tts' | 'navigation' | 'general';
}

export class KeyboardShortcutService implements IKeyboardShortcutService {
    private shortcuts: Map<string, ShortcutConfig> = new Map();
    private enabled: boolean = true;
    private boundHandler: ((event: KeyboardEvent) => void) | null = null;
    private boundKeyUpHandler: ((event: KeyboardEvent) => void) | null = null;
    private pressedKeys: Set<string> = new Set();
    private executionThrottle: Map<string, number> = new Map();
    private readonly THROTTLE_DELAY = 300; // 300ms throttle to prevent rapid execution

    registerShortcuts(shortcuts: ShortcutConfig[]): void {
        // Clear existing shortcuts
        this.unregisterShortcuts();

        // Register new shortcuts
        shortcuts.forEach(shortcut => {
            const key = this.createShortcutKey(shortcut);
            this.shortcuts.set(key, shortcut);
        });

        // Bind event listeners
        this.boundHandler = this.handleKeydown.bind(this);
        this.boundKeyUpHandler = this.handleKeyup.bind(this);
        document.addEventListener('keydown', this.boundHandler);
        document.addEventListener('keyup', this.boundKeyUpHandler);

        console.log(`Registered ${shortcuts.length} keyboard shortcuts:`,
            shortcuts.map(s => `${this.formatShortcutDisplay(s)} - ${s.description}`)
        );
    }

    unregisterShortcuts(): void {
        if (this.boundHandler) {
            document.removeEventListener('keydown', this.boundHandler);
            this.boundHandler = null;
        }
        if (this.boundKeyUpHandler) {
            document.removeEventListener('keyup', this.boundKeyUpHandler);
            this.boundKeyUpHandler = null;
        }
        this.shortcuts.clear();
        this.pressedKeys.clear();
        this.executionThrottle.clear();
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            // Clear pressed keys when disabled
            this.pressedKeys.clear();
            this.executionThrottle.clear();
        }
        console.log(`Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}`);
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (!this.enabled) return;

        // Don't trigger shortcuts when user is typing in input fields
        if (this.isInputElement(event.target as Element)) return;

        const shortcutKey = this.createShortcutKey({
            key: event.key.toLowerCase(),
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            action: () => { }, // Placeholder
            description: '',
            category: 'general'
        });

        // Check if this key combination is already pressed (prevent key repeat)
        if (this.pressedKeys.has(shortcutKey)) {
            return; // Already handling this key combination
        }

        // Check throttle to prevent rapid execution
        const now = Date.now();
        const lastExecution = this.executionThrottle.get(shortcutKey) || 0;
        if (now - lastExecution < this.THROTTLE_DELAY) {
            console.log(`Throttled shortcut execution: ${shortcutKey}`);
            return;
        }

        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut) {
            // Mark this key combination as pressed
            this.pressedKeys.add(shortcutKey);
            
            // Update throttle timestamp
            this.executionThrottle.set(shortcutKey, now);

            event.preventDefault();
            event.stopPropagation();

            try {
                shortcut.action();
                console.log(`Executed shortcut: ${this.formatShortcutDisplay(shortcut)} (${shortcutKey})`);
            } catch (error) {
                console.error(`Error executing shortcut ${shortcutKey}:`, error);
            }
        }
    }

    private handleKeyup(event: KeyboardEvent): void {
        if (!this.enabled) return;

        const shortcutKey = this.createShortcutKey({
            key: event.key.toLowerCase(),
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            action: () => { }, // Placeholder
            description: '',
            category: 'general'
        });

        // Remove from pressed keys when key is released
        this.pressedKeys.delete(shortcutKey);

        // Also remove simpler versions (for modifier keys)
        const keyOnly = event.key.toLowerCase();
        this.pressedKeys.delete(keyOnly);
    }

    private createShortcutKey(config: ShortcutConfig): string {
        const modifiers = [];
        if (config.ctrlKey) modifiers.push('ctrl');
        if (config.altKey) modifiers.push('alt');
        if (config.shiftKey) modifiers.push('shift');

        return `${modifiers.join('+')}${modifiers.length > 0 ? '+' : ''}${config.key.toLowerCase()}`;
    }

    private formatShortcutDisplay(config: ShortcutConfig): string {
        const modifiers = [];
        if (config.ctrlKey) modifiers.push('Ctrl');
        if (config.altKey) modifiers.push('Alt');
        if (config.shiftKey) modifiers.push('Shift');

        return `${modifiers.join('+')}${modifiers.length > 0 ? '+' : ''}${config.key.toUpperCase()}`;
    }

    private isInputElement(element: Element | null): boolean {
        if (!element) return false;

        const tagName = element.tagName.toLowerCase();
        const inputTypes = ['input', 'textarea', 'select'];

        if (inputTypes.includes(tagName)) return true;

        // Check for contenteditable
        if (element.getAttribute('contenteditable') === 'true') return true;

        return false;
    }

    // Public method to get current shortcuts for display
    getRegisteredShortcuts(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values());
    }
}
