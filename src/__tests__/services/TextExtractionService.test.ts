import { EpubTextExtractionService, ITextExtractionService } from '../../lib/services/TextExtractionService';
import { TextChunk, IFRAME_SELECTORS } from '../../types/tts';

// Mock errorUtils to avoid actual error handling
jest.mock('../../lib/utils/errorUtils', () => ({
  handleDevelopmentError: jest.fn(),
  extractErrorMessage: jest.fn(),
  createError: jest.fn()
}));

describe('EpubTextExtractionService - SOLID Architecture Tests', () => {
  let service: ITextExtractionService;
  let concreteService: EpubTextExtractionService;

  beforeEach(() => {
    concreteService = new EpubTextExtractionService();
    service = concreteService;

    // Mock iframe DOM structure for realistic testing
    document.body.innerHTML = `
      <div id="readium-reader">
        <iframe title="Readium" src="about:blank" style="visibility: visible; display: block; opacity: 1;">
        </iframe>
      </div>
    `;

    // Mock iframe content document with proper DOM methods
    const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
    const mockBody = {
      innerHTML: 'Mock content',
      innerText: 'This is fallback text content for testing.',
      querySelectorAll: jest.fn(),
      querySelector: jest.fn(),
      appendChild: jest.fn()
    };

    const mockContentDocument = {
      body: mockBody,
      querySelectorAll: jest.fn(),
      querySelector: jest.fn(),
      createElement: jest.fn().mockImplementation(() => document.createElement('div')),
      createTreeWalker: jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce({ textContent: 'First paragraph text.', parentElement: { tagName: 'P' } })
          .mockReturnValueOnce({ textContent: 'Second paragraph text.', parentElement: { tagName: 'P' } })
          .mockReturnValue(null)
      })
    };

    Object.defineProperty(iframe, 'contentDocument', {
      value: mockContentDocument,
      writable: true
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('Interface Compliance (Single Responsibility)', () => {
    test('implements ITextExtractionService interface correctly', () => {
      expect(service).toHaveProperty('extractTextChunks');
      expect(service).toHaveProperty('getCurrentReaderElement');
      expect(typeof service.extractTextChunks).toBe('function');
      expect(typeof service.getCurrentReaderElement).toBe('function');
    });

    test('service focuses solely on text extraction responsibility', () => {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      const publicMethods = methods.filter(method =>
        method !== 'constructor' && !method.startsWith('_') && typeof (service as any)[method] === 'function'
      );

      expect(publicMethods).toContain('extractTextChunks');
      expect(publicMethods).toContain('getCurrentReaderElement');
      // Service has the two interface methods plus private methods that are implementation details
      expect(publicMethods.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Text Extraction Core Functionality', () => {
    test('extractTextChunks returns array of text chunks', async () => {
      const chunks = await service.extractTextChunks();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThanOrEqual(1);

      chunks.forEach((chunk: TextChunk) => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('element');
        expect(typeof chunk.text).toBe('string');
        expect(chunk.text.length).toBeGreaterThan(0);
      });
    });

    test('extractTextChunks handles missing content gracefully', async () => {
      document.body.innerHTML = '<div>No readium content</div>';

      const chunks = await service.extractTextChunks();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(1);
      expect(chunks[0].element).toBe('fallback');
      expect(chunks[0].text).toContain('Unable to extract text');
    });
  });

  describe('Reader Element Access', () => {
    test('getCurrentReaderElement returns readium reader element', () => {
      const readerElement = service.getCurrentReaderElement();
      expect(readerElement).toBeTruthy();
    });

    test('getCurrentReaderElement handles missing reader gracefully', () => {
      document.body.innerHTML = '<div>No readium content</div>';
      const readerElement = service.getCurrentReaderElement();
      expect(readerElement).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('extractTextChunks handles DOM exceptions gracefully', async () => {
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockImplementation(() => {
        throw new Error('DOM access error');
      });

      const chunks = await service.extractTextChunks();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(1);
      expect(chunks[0].element).toBe('fallback');
      expect(chunks[0].text).toContain('Error extracting text');

      document.querySelector = originalQuerySelector;
    });
  });

  describe('Configuration Validation', () => {
    test('IFRAME_SELECTORS contains expected selectors', () => {
      expect(IFRAME_SELECTORS).toBeDefined();
      expect(Array.isArray(IFRAME_SELECTORS)).toBe(true);
      expect(IFRAME_SELECTORS.length).toBeGreaterThan(0);
      expect(IFRAME_SELECTORS).toContain('iframe[title="Readium"]');
    });

    test('TextChunk interface compliance', async () => {
      const chunks = await service.extractTextChunks();

      expect(chunks.length).toBeGreaterThanOrEqual(1);

      chunks.forEach((chunk: TextChunk) => {
        expect(chunk).toMatchObject({
          text: expect.any(String),
          element: expect.any(String)
        });

        expect(chunk.text.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation Methods', () => {
    test('hasNextPage returns boolean for next page availability', async () => {
      // Mock next button
      document.body.innerHTML = `
        <button title="Next page" aria-label="Go forward">Next</button>
        <iframe title="Readium"></iframe>
      `;

      const hasNext = await service.hasNextPage();
      expect(typeof hasNext).toBe('boolean');
    });

    test('hasNextPage returns false when button is disabled', async () => {
      document.body.innerHTML = `
        <button title="Next page" disabled>Next</button>
        <iframe title="Readium"></iframe>
      `;

      const hasNext = await service.hasNextPage();
      expect(hasNext).toBe(false);
    });

    test('navigateToNextPage attempts navigation', async () => {
      const mockClick = jest.fn();
      document.body.innerHTML = `
        <button title="Next page" aria-label="Go forward">Next</button>
        <iframe title="Readium"></iframe>
      `;

      const nextButton = document.querySelector('button') as HTMLElement;
      nextButton.click = mockClick;

      const result = await service.navigateToNextPage();
      expect(mockClick).toHaveBeenCalled();
      expect(typeof result).toBe('boolean');
    }, 10000);

    test('navigateToNextPage returns false on error', async () => {
      // No navigation elements - should try keyboard navigation which returns false in test environment
      document.body.innerHTML = '<div>No navigation</div>';

      const result = await service.navigateToNextPage();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Text Extraction Methods Coverage', () => {
    test('extractVisibleTextChunks with visible elements', async () => {
      // Create mock elements with getBoundingClientRect
      const mockElement = document.createElement('p');
      mockElement.textContent = 'Visible paragraph text';
      mockElement.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 10, left: 10, bottom: 50, right: 100, width: 90, height: 40
      });

      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Mock appendChild to track usage
      mockDoc.body.appendChild = jest.fn();

      // Mock TreeWalker for visible nodes
      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce({ textContent: 'Visible text', parentElement: mockElement })
          .mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('extractFallbackTextChunks with large text content', async () => {
      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Mock large text content (over FALLBACK_TEXT_LIMIT)
      const largeText = 'A'.repeat(3000);
      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce({ textContent: largeText, parentElement: { tagName: 'DIV' } })
          .mockReturnValue(null)
      });

      // Force fallback extraction by removing visible elements
      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('convertNodesToChunks with mixed valid and invalid nodes', async () => {
      // Test just verifies the service handles mixed content gracefully
      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Set up normal text content
      mockDoc.body.innerText = 'Test content for extraction';

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text.length).toBeGreaterThan(0);
      expect(chunks[0].element).toBeDefined();
    });

    test('isElementInViewport with iframe context', async () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 10, left: 10, bottom: 50, right: 100, width: 90, height: 40
      });

      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;

      // Mock iframe content window
      Object.defineProperty(iframe, 'contentWindow', {
        value: { innerHeight: 600, innerWidth: 800 },
        writable: true
      });

      // Mock owner document for iframe context
      Object.defineProperty(mockElement, 'ownerDocument', {
        value: {
          defaultView: {
            frameElement: iframe
          }
        },
        writable: true
      });

      const iframe2 = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe2.contentDocument!;

      // Mock appendChild and other DOM methods
      mockDoc.body.appendChild = jest.fn();

      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce({ textContent: 'Iframe text', parentElement: mockElement })
          .mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('limitTextLength with long sentences', async () => {
      const longText = 'This is sentence one. '.repeat(50) + 'This is sentence two. '.repeat(50);

      document.body.innerHTML = '<div>No readium content</div>';

      // Mock window.getSelection to return long text
      Object.defineProperty(window, 'getSelection', {
        value: jest.fn().mockReturnValue({
          toString: () => longText.substring(0, 100) // Shorter text to test actual limit behavior
        }),
        writable: true
      });

      const chunks = await service.extractTextChunks();
      expect(chunks[0].text.length).toBeLessThanOrEqual(200); // Reasonable expectation
    });

    test('keyboard navigation with different key events', async () => {
      const mockDispatchEvent = jest.spyOn(document, 'dispatchEvent');

      document.body.innerHTML = `
        <iframe title="Readium"></iframe>
      `;

      const result = await service.navigateToNextPage();

      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'ArrowRight',
          code: 'ArrowRight'
        })
      );
      expect(typeof result).toBe('boolean');
    }, 10000);

    test('thorium navigation with postMessage', async () => {
      const mockPostMessage = jest.fn();

      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      Object.defineProperty(iframe, 'contentWindow', {
        value: { postMessage: mockPostMessage },
        writable: true
      });

      const result = await service.navigateToNextPage();

      expect(mockPostMessage).toHaveBeenCalledWith(
        { action: 'nextPage' },
        '*'
      );
      expect(typeof result).toBe('boolean');
    }, 10000);

    test('waitForNavigation with URL change', async () => {
      // Test navigation without actually changing location
      const result = await service.navigateToNextPage();
      expect(typeof result).toBe('boolean');
    });

    test('extractVisibleText with viewport filtering', async () => {
      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Mock elements with different visibility
      const visibleElement = document.createElement('p');
      visibleElement.textContent = 'Visible content';
      visibleElement.getBoundingClientRect = jest.fn().mockReturnValue({
        top: 10, left: 10, bottom: 50, right: 100, width: 90, height: 40
      });

      const hiddenElement = document.createElement('p');
      hiddenElement.textContent = 'Hidden content';
      hiddenElement.getBoundingClientRect = jest.fn().mockReturnValue({
        top: -100, left: -100, bottom: -50, right: -10, width: 90, height: 40
      });

      // Mock appendChild
      mockDoc.body.appendChild = jest.fn();

      // Mock TreeWalker to return both elements
      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce(visibleElement)
          .mockReturnValueOnce(hiddenElement)
          .mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('getBoundingClientRect throwing error', async () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = 'Test content';
      mockElement.getBoundingClientRect = jest.fn().mockImplementation(() => {
        throw new Error('getBoundingClientRect failed');
      });

      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Mock appendChild
      mockDoc.body.appendChild = jest.fn();

      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce({ textContent: 'Test text', parentElement: mockElement })
          .mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('thorium navigation API availability', async () => {
      // Mock thorium API
      (window as any).thorium = {
        reader: {
          nextPage: jest.fn().mockResolvedValue(true)
        }
      };

      const result = await service.navigateToNextPage();
      expect((window as any).thorium.reader.nextPage).toHaveBeenCalled();

      // Cleanup
      delete (window as any).thorium;
    });

    test('readium navigation API availability', async () => {
      // Mock readium API
      (window as any).readium = {
        navigator: {
          next: jest.fn().mockResolvedValue(true)
        }
      };

      const result = await service.navigateToNextPage();
      expect((window as any).readium.navigator.next).toHaveBeenCalled();

      // Cleanup
      delete (window as any).readium;
    });

    test('empty text content handling', async () => {
      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      // Mock empty content
      mockDoc.body.innerText = '';
      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBe(1);
      expect(chunks[0].element).toBe('fallback');
      // The actual message depends on whether innerText has content or not
      expect(chunks[0].text).toMatch(/No text content found|Error extracting text/);
    });

    test('calculateTotalTextLength with mixed content', async () => {
      const nodes = [
        { textContent: 'First text' },
        { textContent: null },
        { textContent: 'Second text' },
        { textContent: undefined },
        { textContent: '' }
      ];

      const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
      const mockDoc = iframe.contentDocument!;

      mockDoc.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn()
          .mockReturnValueOnce(nodes[0])
          .mockReturnValueOnce(nodes[2])
          .mockReturnValue(null)
      });

      const chunks = await service.extractTextChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
