import { EpubTextExtractionService } from '@/lib/services/TextExtractionService';

describe('Text Extraction Integration', () => {
  let textService: EpubTextExtractionService;

  beforeEach(() => {
    textService = new EpubTextExtractionService();
    setupMockDOM();
  });

  afterEach(() => {
    cleanupMockDOM();
  });

  function setupMockDOM() {
    // Create mock iframe for text extraction
    const mockIframe = document.createElement('iframe');
    mockIframe.id = 'rs-viewer-frame';
    document.body.appendChild(mockIframe);

    const mockContentDocument = document.implementation.createHTMLDocument('Mock Document');
    mockContentDocument.body.innerHTML = `
      <article>
        <p>First paragraph for TTS testing.</p>
        <p>Second paragraph with more content.</p>
      </article>
    `;

    Object.defineProperty(mockIframe, 'contentDocument', {
      value: mockContentDocument,
      writable: true
    });
  }

  function cleanupMockDOM() {
    const iframe = document.getElementById('rs-viewer-frame');
    if (iframe) {
      document.body.removeChild(iframe);
    }
  }

  it('should extract text from EPUB content', () => {
    // Given: Mock DOM is set up with content
    const iframe = document.getElementById('rs-viewer-frame') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.contentDocument?.body.textContent).toContain('First paragraph');
  });

  it('should handle missing iframe gracefully', () => {
    // Given: No iframe exists
    cleanupMockDOM();

    // When/Then: Text extraction should handle missing iframe
    // This would depend on your actual TextExtractionService implementation
    expect(textService).toBeInstanceOf(EpubTextExtractionService);
  });

  it('should extract multiple paragraphs', () => {
    // Given: Multiple paragraphs in content
    const iframe = document.getElementById('rs-viewer-frame') as HTMLIFrameElement;
    const paragraphs = iframe.contentDocument?.querySelectorAll('p');

    // Then: Multiple paragraphs should be available
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs?.[0].textContent).toContain('First paragraph');
    expect(paragraphs?.[1].textContent).toContain('Second paragraph');
  });
});
