import { KeyboardHandler, KeyboardShortcut } from '@/lib/handlers/KeyboardHandler';

describe('KeyboardHandler', () => {
  let keyboardHandler: KeyboardHandler;
  let mockConsoleError: jest.SpyInstance;

  // Mock DOM elements
  const createMockElement = (tagName: string, contentEditable?: string): Element => {
    const element = {
      tagName: tagName.toUpperCase(),
      getAttribute: jest.fn((attr: string) => {
        if (attr === 'contenteditable') return contentEditable || null;
        return null;
      }),
    } as unknown as Element;
    return element;
  };

  // Mock keyboard event
  const createKeyboardEvent = (
    key: string,
    ctrlKey = false,
    altKey = false,
    shiftKey = false,
    target?: Element
  ): KeyboardEvent => {
    const event = {
      key,
      ctrlKey,
      altKey,
      shiftKey,
      target: target || createMockElement('div'),
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent;
    return event;
  };

  beforeEach(() => {
    keyboardHandler = new KeyboardHandler();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    // Mock document.addEventListener and removeEventListener
    jest.spyOn(document, 'addEventListener').mockImplementation();
    jest.spyOn(document, 'removeEventListener').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockRestore();
    keyboardHandler.cleanup();
  });

  describe('Constructor', () => {
    it('should initialize with empty shortcuts and enabled state', () => {
      expect(keyboardHandler.getShortcuts()).toEqual([]);
    });
  });

  describe('register', () => {
    const mockShortcuts: KeyboardShortcut[] = [
      {
        key: 'a',
        action: jest.fn(),
        description: 'Action A',
      },
      {
        key: 'b',
        ctrlKey: true,
        action: jest.fn(),
        description: 'Ctrl+B Action',
      },
      {
        key: 'c',
        altKey: true,
        shiftKey: true,
        action: jest.fn(),
        description: 'Alt+Shift+C Action',
      },
    ];

    it('should register shortcuts and add event listener', () => {
      keyboardHandler.register(mockShortcuts);

      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(keyboardHandler.getShortcuts()).toEqual(mockShortcuts);
    });

    it('should cleanup previous shortcuts before registering new ones', () => {
      const firstShortcuts: KeyboardShortcut[] = [
        { key: 'x', action: jest.fn(), description: 'X Action' },
      ];
      const secondShortcuts: KeyboardShortcut[] = [
        { key: 'y', action: jest.fn(), description: 'Y Action' },
      ];

      keyboardHandler.register(firstShortcuts);
      expect(keyboardHandler.getShortcuts()).toHaveLength(1);

      keyboardHandler.register(secondShortcuts);
      expect(keyboardHandler.getShortcuts()).toHaveLength(1);
      expect(keyboardHandler.getShortcuts()[0].key).toBe('y');
    });

    it('should handle multiple shortcuts with modifier keys', () => {
      keyboardHandler.register(mockShortcuts);
      const shortcuts = keyboardHandler.getShortcuts();

      expect(shortcuts).toHaveLength(3);
      expect(shortcuts.find(s => s.key === 'a')).toBeDefined();
      expect(shortcuts.find(s => s.key === 'b' && s.ctrlKey)).toBeDefined();
      expect(shortcuts.find(s => s.key === 'c' && s.altKey && s.shiftKey)).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should remove event listener and clear shortcuts', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', action: jest.fn(), description: 'Action A' },
      ];

      keyboardHandler.register(shortcuts);
      expect(keyboardHandler.getShortcuts()).toHaveLength(1);

      keyboardHandler.cleanup();
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(keyboardHandler.getShortcuts()).toEqual([]);
    });

    it('should handle cleanup when no event listener is registered', () => {
      expect(() => keyboardHandler.cleanup()).not.toThrow();
      expect(document.removeEventListener).not.toHaveBeenCalled();
    });

    it('should handle multiple cleanup calls', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', action: jest.fn(), description: 'Action A' },
      ];

      keyboardHandler.register(shortcuts);
      keyboardHandler.cleanup();
      keyboardHandler.cleanup(); // Second cleanup should not throw

      expect(keyboardHandler.getShortcuts()).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('should enable and disable the handler', () => {
      // Since enabled is private, we test through behavior
      // This is tested more thoroughly in handleKeydown tests
      expect(() => keyboardHandler.setEnabled(false)).not.toThrow();
      expect(() => keyboardHandler.setEnabled(true)).not.toThrow();
    });
  });

  describe('getShortcuts', () => {
    it('should return empty array initially', () => {
      expect(keyboardHandler.getShortcuts()).toEqual([]);
    });

    it('should return registered shortcuts', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', action: jest.fn(), description: 'Action A' },
        { key: 'b', ctrlKey: true, action: jest.fn(), description: 'Ctrl+B' },
      ];

      keyboardHandler.register(shortcuts);
      expect(keyboardHandler.getShortcuts()).toEqual(shortcuts);
    });

    it('should return copy of shortcuts array', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', action: jest.fn(), description: 'Action A' },
      ];

      keyboardHandler.register(shortcuts);
      const returned = keyboardHandler.getShortcuts();

      expect(returned).toEqual(shortcuts);
      expect(returned).not.toBe(shortcuts); // Should be a copy
    });
  });

  describe('createKey (private method behavior)', () => {
    it('should create correct key combinations for shortcuts', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'A', action: jest.fn(), description: 'Test' }, // Should be lowercase
        { key: 'b', ctrlKey: true, action: jest.fn(), description: 'Test' },
        { key: 'c', altKey: true, action: jest.fn(), description: 'Test' },
        { key: 'd', shiftKey: true, action: jest.fn(), description: 'Test' },
        { key: 'e', ctrlKey: true, altKey: true, shiftKey: true, action: jest.fn(), description: 'Test' },
      ];

      keyboardHandler.register(shortcuts);

      // Test through handleKeydown behavior since createKey is private
      const boundHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];

      // Test simple key (uppercase should become lowercase)
      const actionA = jest.fn();
      shortcuts[0].action = actionA;
      boundHandler(createKeyboardEvent('A'));
      expect(actionA).toHaveBeenCalled();

      // Test ctrl+key
      const actionB = jest.fn();
      shortcuts[1].action = actionB;
      boundHandler(createKeyboardEvent('b', true));
      expect(actionB).toHaveBeenCalled();
    });
  });

  describe('handleKeydown (private method behavior)', () => {
    let shortcuts: KeyboardShortcut[];
    let boundHandler: (event: KeyboardEvent) => void;

    beforeEach(() => {
      shortcuts = [
        { key: 'a', action: jest.fn(), description: 'Action A' },
        { key: 'b', ctrlKey: true, action: jest.fn(), description: 'Ctrl+B' },
        { key: 'c', altKey: true, shiftKey: true, action: jest.fn(), description: 'Alt+Shift+C' },
      ];

      keyboardHandler.register(shortcuts);
      boundHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    });

    it('should execute action for matching shortcut', () => {
      const event = createKeyboardEvent('a');
      boundHandler(event);

      expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should execute action for shortcut with modifier keys', () => {
      const event = createKeyboardEvent('b', true); // Ctrl+B
      boundHandler(event);

      expect(shortcuts[1].action).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should execute action for shortcut with multiple modifier keys', () => {
      const event = createKeyboardEvent('c', false, true, true); // Alt+Shift+C
      boundHandler(event);

      expect(shortcuts[2].action).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should not execute action for non-matching shortcut', () => {
      const event = createKeyboardEvent('x');
      boundHandler(event);

      shortcuts.forEach(shortcut => {
        expect(shortcut.action).not.toHaveBeenCalled();
      });
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it('should not execute action when disabled', () => {
      keyboardHandler.setEnabled(false);

      const event = createKeyboardEvent('a');
      boundHandler(event);

      expect(shortcuts[0].action).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not execute action when target is input element', () => {
      const inputElement = createMockElement('input');
      const event = createKeyboardEvent('a', false, false, false, inputElement);
      boundHandler(event);

      expect(shortcuts[0].action).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should not execute action when target is textarea element', () => {
      const textareaElement = createMockElement('textarea');
      const event = createKeyboardEvent('a', false, false, false, textareaElement);
      boundHandler(event);

      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });

    it('should not execute action when target is select element', () => {
      const selectElement = createMockElement('select');
      const event = createKeyboardEvent('a', false, false, false, selectElement);
      boundHandler(event);

      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });

    it('should not execute action when target is contenteditable element', () => {
      const editableElement = createMockElement('div', 'true');
      const event = createKeyboardEvent('a', false, false, false, editableElement);
      boundHandler(event);

      expect(shortcuts[0].action).not.toHaveBeenCalled();
    });

    it('should execute action when target is not an input element', () => {
      const divElement = createMockElement('div');
      const event = createKeyboardEvent('a', false, false, false, divElement);
      boundHandler(event);

      expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
    });

    it('should handle null target element', () => {
      const event = createKeyboardEvent('a', false, false, false, null as unknown as Element);
      boundHandler(event);

      expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
    });

    it('should handle action throwing error', () => {
      const errorAction = jest.fn().mockImplementation(() => {
        throw new Error('Action error');
      });

      const errorShortcuts: KeyboardShortcut[] = [
        { key: 'e', action: errorAction, description: 'Error Action' },
      ];

      keyboardHandler.register(errorShortcuts);
      const errorBoundHandler = (document.addEventListener as jest.Mock).mock.calls[1][1];

      const event = createKeyboardEvent('e');

      expect(() => errorBoundHandler(event)).not.toThrow();
      expect(errorAction).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith('Error executing shortcut e:', expect.any(Error));
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('isInputElement (private method behavior)', () => {
    let boundHandler: (event: KeyboardEvent) => void;
    let shortcuts: KeyboardShortcut[];

    beforeEach(() => {
      shortcuts = [
        { key: 'a', action: jest.fn(), description: 'Test Action' },
      ];
      keyboardHandler.register(shortcuts);
      boundHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];
    });

    it('should identify input elements correctly', () => {
      const testCases = [
        { element: createMockElement('input'), shouldBlock: true },
        { element: createMockElement('INPUT'), shouldBlock: true }, // Test case insensitive
        { element: createMockElement('textarea'), shouldBlock: true },
        { element: createMockElement('TEXTAREA'), shouldBlock: true },
        { element: createMockElement('select'), shouldBlock: true },
        { element: createMockElement('SELECT'), shouldBlock: true },
        { element: createMockElement('div', 'true'), shouldBlock: true }, // contenteditable
        { element: createMockElement('div'), shouldBlock: false },
        { element: createMockElement('span'), shouldBlock: false },
        { element: createMockElement('button'), shouldBlock: false },
      ];

      testCases.forEach(({ element, shouldBlock }) => {
        // Reset the mock
        (shortcuts[0].action as jest.Mock).mockClear();

        const event = createKeyboardEvent('a', false, false, false, element);
        boundHandler(event);

        if (shouldBlock) {
          expect(shortcuts[0].action).not.toHaveBeenCalled();
        } else {
          expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
        }
      });
    });

    it('should handle null element', () => {
      const event = createKeyboardEvent('a', false, false, false, null as unknown as Element);
      boundHandler(event);

      expect(shortcuts[0].action).toHaveBeenCalledTimes(1);
    });
  });

  describe('Case sensitivity and normalization', () => {
    it('should handle case-insensitive key matching', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'A', action: jest.fn(), description: 'Uppercase A' },
        { key: 'b', action: jest.fn(), description: 'Lowercase b' },
      ];

      keyboardHandler.register(shortcuts);
      const boundHandler = (document.addEventListener as jest.Mock).mock.calls[0][1];

      // Test that both uppercase and lowercase work
      boundHandler(createKeyboardEvent('A'));
      expect(shortcuts[0].action).toHaveBeenCalledTimes(1);

      boundHandler(createKeyboardEvent('a'));
      expect(shortcuts[0].action).toHaveBeenCalledTimes(2);

      boundHandler(createKeyboardEvent('B'));
      expect(shortcuts[1].action).toHaveBeenCalledTimes(1);

      boundHandler(createKeyboardEvent('b'));
      expect(shortcuts[1].action).toHaveBeenCalledTimes(2);
    });
  });
});
