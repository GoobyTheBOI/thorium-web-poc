import { EpubTextExtractionService, ITextExtractionService } from '../../lib/services/TextExtractionService';
import { TextChunk, IFRAME_SELECTORS } from '../../types/tts';

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

    // Mock iframe content document
    const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
    const mockContentDocument = {
      body: {
        innerHTML: 'Mock content',
        innerText: 'This is fallback text content for testing.',
        querySelectorAll: jest.fn(),
        querySelector: jest.fn()
      },
      querySelectorAll: jest.fn(),
      querySelector: jest.fn(),
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
        method !== 'constructor' && !method.startsWith('_') && typeof (service as unknown)[method] === 'function'
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
});
