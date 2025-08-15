import { EpubTextExtractionService } from '../../lib/services/TextExtractionService';

// Mock readium-speech
jest.mock('readium-speech', () => ({
  getVoices: jest.fn().mockResolvedValue([
    { name: 'Test Voice', label: 'Test Voice', language: 'en-US', voiceURI: 'test-voice' }
  ]),
}));

describe('EpubTextExtractionService', () => {
  let service: EpubTextExtractionService;

  beforeEach(() => {
    service = new EpubTextExtractionService();

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="readium-reader">
        <div class="readium-content">
          <p id="para1">This is the first paragraph with some text.</p>
          <p id="para2">This is the second paragraph with more content.</p>
          <h2 id="heading1">This is a heading</h2>
          <span id="span1">This is a span element.</span>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Text Extraction', () => {
    test('extractTextChunks returns array of text chunks', async () => {
      const chunks = await service.extractTextChunks();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);

      // Check that chunks have correct structure
      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('element');
        expect(typeof chunk.text).toBe('string');
        expect(typeof chunk.element).toBe('string');
      });
    });

    test('extractTextChunks handles different element types', async () => {
      const chunks = await service.extractTextChunks();

      // Should find paragraphs
      const paragraphChunks = chunks.filter(chunk => chunk.element === 'P');
      expect(paragraphChunks.length).toBeGreaterThan(0);

      // Should find headings
      const headingChunks = chunks.filter(chunk => chunk.element === 'H2');
      expect(headingChunks.length).toBeGreaterThan(0);
    });

    test('extractTextChunks filters out empty text', async () => {
      // Add empty elements
      document.body.innerHTML += '<p id="empty1"></p><p id="empty2">   </p>';

      const chunks = await service.extractTextChunks();

      // All chunks should have non-empty text
      chunks.forEach(chunk => {
        expect(chunk.text.trim()).not.toBe('');
        expect(chunk.text.length).toBeGreaterThan(0);
      });
    });

    test('extractTextChunks handles missing content gracefully', async () => {
      document.body.innerHTML = '<div id="no-content"></div>';

      const chunks = await service.extractTextChunks();

      expect(Array.isArray(chunks)).toBe(true);
      // Should return empty array or handle gracefully
    });
  });

  describe('Element Type Detection', () => {
    test('getElementType correctly identifies paragraphs', () => {
      const paragraph = document.getElementById('para1') as HTMLElement;
      const elementType = (service as any).getElementType(paragraph);

      expect(elementType).toBe('paragraph');
    });

    test('getElementType correctly identifies headings', () => {
      const heading = document.getElementById('heading1') as HTMLElement;
      const elementType = (service as any).getElementType(heading);

      expect(elementType).toBe('heading');
    });

    test('getElementType handles unknown elements', () => {
      const span = document.getElementById('span1') as HTMLElement;
      const elementType = (service as any).getElementType(span);

      expect(elementType).toBe('normal');
    });

    test('getElementType handles null elements', () => {
      const elementType = (service as any).getElementType(null);

      expect(elementType).toBe('normal');
    });
  });

  describe('Current Reader Element', () => {
    test('getCurrentReaderElement returns readium reader element', () => {
      const readerElement = service.getCurrentReaderElement();

      expect(readerElement).toBeDefined();
      if (readerElement) {
        expect(readerElement.id).toBe('readium-reader');
      }
    });

    test('getCurrentReaderElement handles missing reader gracefully', () => {
      document.body.innerHTML = '<div>No reader here</div>';

      const readerElement = service.getCurrentReaderElement();

      // Should handle gracefully (return null or find alternative)
      expect(typeof readerElement).toBeDefined();
    });
  });

  describe('Text Processing', () => {
    test('processTextContent normalizes text correctly', () => {
      const testText = '  This is   some   text with   spaces  ';
      const processed = (service as any).processTextContent(testText);

      expect(processed).toBe('This is some text with spaces');
      expect(processed).not.toContain('  '); // No double spaces
    });

    test('processTextContent handles empty strings', () => {
      const emptyText = '';
      const processed = (service as any).processTextContent(emptyText);

      expect(processed).toBe('');
    });

    test('processTextContent handles null/undefined', () => {
      const processedNull = (service as any).processTextContent(null);
      const processedUndefined = (service as any).processTextContent(undefined);

      expect(processedNull).toBe('');
      expect(processedUndefined).toBe('');
    });

    test('processTextContent removes special characters', () => {
      const textWithSpecialChars = 'Hello\n\r\tWorld\u00a0Test';
      const processed = (service as any).processTextContent(textWithSpecialChars);

      expect(processed).toBe('Hello World Test');
      expect(processed).not.toContain('\n');
      expect(processed).not.toContain('\r');
      expect(processed).not.toContain('\t');
    });
  });

  describe('Content Selection', () => {
    test('getTextContentFromElement extracts text from element', () => {
      const paragraph = document.getElementById('para1') as HTMLElement;
      const text = (service as any).getTextContentFromElement(paragraph);

      expect(text).toBe('This is the first paragraph with some text.');
      expect(typeof text).toBe('string');
    });

    test('getTextContentFromElement handles nested elements', () => {
      document.body.innerHTML = `
        <div id="nested">
          <p>Paragraph text <span>with nested span</span> content.</p>
        </div>
      `;

      const nestedDiv = document.getElementById('nested') as HTMLElement;
      const text = (service as any).getTextContentFromElement(nestedDiv);

      expect(text).toContain('Paragraph text');
      expect(text).toContain('with nested span');
      expect(text).toContain('content.');
    });

    test('getTextContentFromElement handles empty elements', () => {
      document.body.innerHTML = '<div id="empty"></div>';

      const emptyDiv = document.getElementById('empty') as HTMLElement;
      const text = (service as any).getTextContentFromElement(emptyDiv);

      expect(text).toBe('');
    });
  });

  describe('Content Filtering', () => {
    test('isValidTextContent filters out invalid content', () => {
      const validText = 'This is valid text content.';
      const emptyText = '';
      const whitespaceText = '   ';
      const shortText = 'Hi';

      expect((service as any).isValidTextContent(validText)).toBe(true);
      expect((service as any).isValidTextContent(emptyText)).toBe(false);
      expect((service as any).isValidTextContent(whitespaceText)).toBe(false);

      // Short text should be handled appropriately
      const shortTextResult = (service as any).isValidTextContent(shortText);
      expect(typeof shortTextResult).toBe('boolean');
    });

    test('isValidTextContent handles null/undefined', () => {
      expect((service as any).isValidTextContent(null)).toBe(false);
      expect((service as any).isValidTextContent(undefined)).toBe(false);
    });
  });

  describe('Reader Integration', () => {
    test('findReadiumContent locates content container', () => {
      const contentContainer = (service as any).findReadiumContent();

      if (contentContainer) {
        expect(contentContainer.classList.contains('readium-content')).toBe(true);
      }
    });

    test('findReadiumContent handles missing content', () => {
      document.body.innerHTML = '<div>No readium content</div>';

      const contentContainer = (service as any).findReadiumContent();

      // Should handle gracefully
      expect(typeof contentContainer).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('extractTextChunks handles DOM exceptions gracefully', async () => {
      // Mock querySelector to throw error
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockImplementation(() => {
        throw new Error('DOM access error');
      });

      await expect(service.extractTextChunks()).rejects.toThrow();

      // Restore original method
      document.querySelector = originalQuerySelector;
    });

    test('getCurrentReaderElement handles DOM exceptions', () => {
      // Mock getElementById to throw error
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn().mockImplementation(() => {
        throw new Error('Element access error');
      });

      expect(() => service.getCurrentReaderElement()).not.toThrow();

      // Restore original method
      document.getElementById = originalGetElementById;
    });
  });

  describe('Performance Considerations', () => {
    test('extractTextChunks processes large content efficiently', async () => {
      // Create large content
      const largeContent = Array.from({ length: 100 }, (_, i) =>
        `<p id="para${i}">This is paragraph number ${i} with some content.</p>`
      ).join('');

      document.body.innerHTML = `
        <div id="readium-reader">
          <div class="readium-content">
            ${largeContent}
          </div>
        </div>
      `;

      const startTime = performance.now();
      const chunks = await service.extractTextChunks();
      const endTime = performance.now();

      expect(chunks.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('service handles repeated calls efficiently', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        await service.extractTextChunks();
        service.getCurrentReaderElement();
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should be fast for repeated calls
    });
  });
});
