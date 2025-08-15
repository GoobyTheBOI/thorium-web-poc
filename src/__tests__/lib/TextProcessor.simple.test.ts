import { DefaultTextProcessor } from '../../lib/TextProcessor';

describe('DefaultTextProcessor - Working Tests', () => {
  let processor: DefaultTextProcessor;

  beforeEach(() => {
    processor = new DefaultTextProcessor();
  });

  describe('Basic Functionality', () => {
    test('formatText returns formatted text for normal type', () => {
      const result = processor.formatText('Hello world', 'normal');
      expect(result).toBe('Hello world');
    });

    test('formatText handles heading type with SSML', () => {
      const result = processor.formatText('Chapter Title', 'h1');
      expect(result).toContain('<speak>');
      expect(result).toContain('Chapter Title');
      expect(result).toContain('</speak>');
    });

    test('formatText handles paragraph type with SSML', () => {
      const result = processor.formatText('Paragraph text', 'p');
      expect(result).toContain('<speak>');
      expect(result).toContain('Paragraph text');
      expect(result).toContain('</speak>');
    });

    test('formatText handles italic type with SSML', () => {
      const result = processor.formatText('Italic text', 'i');
      expect(result).toContain('<emphasis level="moderate">');
      expect(result).toContain('Italic text');
    });

    test('formatText handles bold type with SSML', () => {
      const result = processor.formatText('Bold text', 'strong');
      expect(result).toContain('<emphasis level="strong">');
      expect(result).toContain('Bold text');
    });

    test('formatText escapes SSML special characters', () => {
      const result = processor.formatText('Text with <tag> & "quotes"', 'normal');
      expect(result).toContain('&lt;tag&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;quotes&quot;');
    });

    test('formatText normalizes whitespace', () => {
      const result = processor.formatText('  Multiple   spaces   here  ', 'normal');
      expect(result).toBe('Multiple spaces here');
    });

    test('formatText removes special characters', () => {
      const result = processor.formatText('Text\nwith\tspecial\rchars\u00a0', 'normal');
      expect(result).toBe('Text with special chars');
    });
  });

  describe('Text Validation', () => {
    test('validateText accepts valid text', () => {
      expect(processor.validateText('Valid text content')).toBe(true);
    });

    test('validateText rejects empty text', () => {
      expect(processor.validateText('')).toBe(false);
    });

    test('validateText rejects null text', () => {
      expect(processor.validateText(null as any)).toBe(false);
    });

    test('validateText rejects undefined text', () => {
      expect(processor.validateText(undefined as any)).toBe(false);
    });

    test('validateText rejects non-string values', () => {
      expect(processor.validateText(123 as any)).toBe(false);
    });

    test('validateText rejects whitespace-only text', () => {
      expect(processor.validateText('   ')).toBe(false);
    });

    test('validateText handles long text correctly', () => {
      const longText = 'A'.repeat(1000); // Within limits
      expect(processor.validateText(longText)).toBe(true);

      const tooLongText = 'A'.repeat(10000); // Exceeds TTS_CONSTANTS.MAX_TEXT_LENGTH
      expect(processor.validateText(tooLongText)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('formatText handles null input gracefully', () => {
      const result = processor.formatText(null as any, 'normal');
      expect(result).toBe('');
    });

    test('formatText handles undefined input gracefully', () => {
      const result = processor.formatText(undefined as any, 'normal');
      expect(result).toBe('');
    });

    test('formatText handles invalid element types gracefully', () => {
      expect(() => processor.formatText('text', 123 as any)).not.toThrow();
      expect(() => processor.formatText('text', null as any)).not.toThrow();
      expect(() => processor.formatText('text', undefined as any)).not.toThrow();
    });

    test('formatText handles non-string element types', () => {
      const result = processor.formatText('text', 123 as any);
      expect(result).toBe('text'); // Should default to normal behavior
    });
  });

  describe('Element Type Detection', () => {
    test('detects heading elements correctly', () => {
      const headingResult = processor.formatText('Heading', 'H1');
      expect(headingResult).toContain('<emphasis level="strong">');

      const h2Result = processor.formatText('Subheading', 'h2');
      expect(h2Result).toContain('<emphasis level="strong">');
    });

    test('detects paragraph elements correctly', () => {
      const result = processor.formatText('Paragraph', 'P');
      expect(result).toContain('<speak>');
      expect(result).toContain('<break time="0.3s"/>');
    });

    test('detects italic elements correctly', () => {
      const emResult = processor.formatText('Emphasized', 'em');
      expect(emResult).toContain('<emphasis level="moderate">');

      const iResult = processor.formatText('Italic', 'I');
      expect(iResult).toContain('<emphasis level="moderate">');
    });

    test('detects bold elements correctly', () => {
      const strongResult = processor.formatText('Strong', 'strong');
      expect(strongResult).toContain('<emphasis level="strong">');

      const bResult = processor.formatText('Bold', 'B');
      expect(bResult).toContain('<emphasis level="strong">');
    });

    test('defaults unknown elements to normal', () => {
      const result = processor.formatText('Unknown element', 'unknown');
      expect(result).toBe('Unknown element');
    });
  });
});
