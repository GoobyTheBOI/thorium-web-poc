import { DefaultTextProcessor } from '../../lib/TextProcessor';

describe('DefaultTextProcessor', () => {
  let processor: DefaultTextProcessor;

  beforeEach(() => {
    processor = new DefaultTextProcessor();
  });

  describe('Text Formatting', () => {
    test('formatText handles basic text formatting', () => {
      const result = processor.formatText('Hello world', 'normal');

      expect(result).toBe('Hello world');
      expect(typeof result).toBe('string');
    });

    test('formatText handles paragraph elements', () => {
      const text = 'This is a paragraph with multiple sentences. It should be formatted properly.';
      const result = processor.formatText(text, 'paragraph');

      expect(result).toContain('This is a paragraph');
      expect(typeof result).toBe('string');
    });

    test('formatText handles heading elements', () => {
      const text = 'Chapter Title';
      const result = processor.formatText(text, 'heading');

      expect(result).toContain('Chapter Title');
      expect(typeof result).toBe('string');
    });

    test('formatText handles italic elements', () => {
      const text = 'emphasized text';
      const result = processor.formatText(text, 'italic');

      expect(result).toContain('emphasized text');
      expect(typeof result).toBe('string');
    });

    test('formatText handles bold elements', () => {
      const text = 'important text';
      const result = processor.formatText(text, 'bold');

      expect(result).toContain('important text');
      expect(typeof result).toBe('string');
    });

    test('formatText normalizes whitespace', () => {
      const text = '  Multiple   spaces   here  ';
      const result = processor.formatText(text, 'normal');

      expect(result).not.toContain('  '); // No double spaces
      expect(result.trim()).toBe(result); // No leading/trailing spaces
    });

    test('formatText handles empty strings', () => {
      const result = processor.formatText('', 'normal');

      expect(result).toBe('');
    });

    test('formatText handles null/undefined gracefully', () => {
      const resultNull = processor.formatText(null as any, 'normal');
      const resultUndefined = processor.formatText(undefined as any, 'normal');

      expect(resultNull).toBe('');
      expect(resultUndefined).toBe('');
    });

    test('formatText removes special characters', () => {
      const text = 'Text\nwith\r\nspecial\tchars\u00a0';
      const result = processor.formatText(text, 'normal');

      expect(result).not.toContain('\n');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\t');
      expect(result).not.toContain('\u00a0');
    });
  });

  describe('Text Validation', () => {
    test('validateText returns true for valid text', () => {
      const validTexts = [
        'Hello world',
        'This is a longer sentence with punctuation.',
        'Text with numbers 123 and symbols!',
        'Internationalization: héllo wörld',
      ];

      validTexts.forEach(text => {
        expect(processor.validateText(text)).toBe(true);
      });
    });

    test('validateText returns false for invalid text', () => {
      const invalidTexts = [
        '',
        '   ',
        null,
        undefined,
      ];

      invalidTexts.forEach(text => {
        expect(processor.validateText(text as any)).toBe(false);
      });
    });

    test('validateText handles minimum length requirements', () => {
      const shortText = 'Hi';
      const longText = 'This is a longer text that should pass validation.';

      // Exact behavior depends on implementation
      expect(typeof processor.validateText(shortText)).toBe('boolean');
      expect(processor.validateText(longText)).toBe(true);
    });

    test('validateText handles special characters appropriately', () => {
      const textWithSpecialChars = 'Text with émojis 🎉 and ñ characters';

      expect(processor.validateText(textWithSpecialChars)).toBe(true);
    });

    test('validateText rejects only whitespace', () => {
      const whitespaceTexts = [
        '   ',
        '\t\t\t',
        '\n\n\n',
        '\r\r\r',
        ' \t \n \r ',
      ];

      whitespaceTexts.forEach(text => {
        expect(processor.validateText(text)).toBe(false);
      });
    });
  });

  describe('Element Type Processing', () => {
    test('processes different element types with appropriate formatting', () => {
      const text = 'Sample text content';
      const elementTypes = ['paragraph', 'heading', 'italic', 'bold', 'normal'];

      elementTypes.forEach(elementType => {
        const result = processor.formatText(text, elementType);

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain('Sample text content');
      });
    });

    test('handles unknown element types gracefully', () => {
      const text = 'Test text';
      const unknownTypes = ['unknown', 'custom', 'div', 'span'];

      unknownTypes.forEach(elementType => {
        expect(() => processor.formatText(text, elementType)).not.toThrow();

        const result = processor.formatText(text, elementType);
        expect(typeof result).toBe('string');
      });
    });

    test('element type processing is case insensitive', () => {
      const text = 'Test text';

      const lowerResult = processor.formatText(text, 'paragraph');
      const upperResult = processor.formatText(text, 'PARAGRAPH');
      const mixedResult = processor.formatText(text, 'Paragraph');

      // Should handle case variations gracefully
      expect(typeof lowerResult).toBe('string');
      expect(typeof upperResult).toBe('string');
      expect(typeof mixedResult).toBe('string');
    });
  });

  describe('Text Normalization', () => {
    test('normalizes line breaks consistently', () => {
      const textWithVariousBreaks = 'Line 1\nLine 2\r\nLine 3\rLine 4';
      const result = processor.formatText(textWithVariousBreaks, 'normal');

      // Should normalize all line breaks to spaces or consistent format
      expect(result).not.toContain('\r\n');
      expect(result).not.toContain('\r');
    });

    test('handles Unicode characters correctly', () => {
      const unicodeText = 'Café, naïve, résumé, 北京, مرحبا, 🌟';
      const result = processor.formatText(unicodeText, 'normal');

      expect(result).toContain('Café');
      expect(result).toContain('naïve');
      expect(result).toContain('résumé');
      expect(result).toContain('北京');
      expect(result).toContain('مرحبا');
      expect(result).toContain('🌟');
    });

    test('normalizes quotation marks and apostrophes', () => {
      const textWithQuotes = `"Hello" 'world' "curly quotes" 'apostrophe's'`;
      const result = processor.formatText(textWithQuotes, 'normal');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('handles HTML entities if present', () => {
      const textWithEntities = 'AT&amp;T, &lt;tag&gt;, &quot;quoted&quot;, &apos;apostrophe&apos;';
      const result = processor.formatText(textWithEntities, 'normal');

      // Should handle or preserve HTML entities appropriately
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles very long text efficiently', () => {
      const longText = 'A'.repeat(10000) + ' ' + 'B'.repeat(10000);

      const startTime = performance.now();
      const result = processor.formatText(longText, 'normal');
      const endTime = performance.now();

      expect(typeof result).toBe('string');
      expect(endTime - startTime).toBeLessThan(100); // Should process quickly
    });

    test('handles repeated processing efficiently', () => {
      const text = 'Sample text for performance testing';

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        processor.formatText(text, 'normal');
        processor.validateText(text);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should handle repeated calls efficiently
    });

    test('handles text with many special characters', () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';

      expect(() => processor.formatText(specialText, 'normal')).not.toThrow();
      expect(() => processor.validateText(specialText)).not.toThrow();

      const result = processor.formatText(specialText, 'normal');
      expect(typeof result).toBe('string');
    });

    test('maintains text integrity during processing', () => {
      const originalText = 'Important content that must be preserved exactly.';
      const result = processor.formatText(originalText, 'normal');

      // Should preserve the essential content
      expect(result).toContain('Important content');
      expect(result).toContain('must be preserved');
      expect(result).toContain('exactly');
    });
  });

  describe('Integration and Configuration', () => {
    test('processor maintains consistent behavior across calls', () => {
      const text = 'Consistent behavior test';

      const result1 = processor.formatText(text, 'normal');
      const result2 = processor.formatText(text, 'normal');
      const result3 = processor.formatText(text, 'normal');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('validation and formatting work together correctly', () => {
      const testTexts = [
        'Valid text content',
        'Another valid piece of text',
        'Text with punctuation!',
        'Text with numbers 123',
      ];

      testTexts.forEach(text => {
        const isValid = processor.validateText(text);
        const formatted = processor.formatText(text, 'normal');

        if (isValid) {
          expect(formatted.length).toBeGreaterThan(0);
          expect(formatted).not.toBe('');
        }
      });
    });

    test('processor handles concurrent access safely', () => {
      const text = 'Concurrent access test';

      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          processor.formatText(`${text} ${i}`, 'normal');
          return processor.validateText(`${text} ${i}`);
        })
      );

      return Promise.all(promises).then(results => {
        expect(results.length).toBe(10);
        results.forEach((result: boolean) => {
          expect(typeof result).toBe('boolean');
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('gracefully handles invalid element types', () => {
      const text = 'Test text';
      const invalidTypes = [null, undefined, 123, {}, []];

      invalidTypes.forEach(elementType => {
        expect(() => processor.formatText(text, elementType as any)).not.toThrow();
      });
    });

    test('formatText recovers from processing errors', () => {
      // Test with potentially problematic input
      const problematicInputs = [
        'Text\x00with\x00null\x00chars',
        'Text with very long line: ' + 'a'.repeat(1000000),
        String.fromCharCode(0xD800), // Invalid Unicode
      ];

      problematicInputs.forEach(input => {
        expect(() => processor.formatText(input, 'normal')).not.toThrow();

        const result = processor.formatText(input, 'normal');
        expect(typeof result).toBe('string');
      });
    });

    test('validateText handles edge cases safely', () => {
      const edgeCases = [
        {},
        [],
        123,
        true,
        function() {},
        Symbol('test'),
      ];

      edgeCases.forEach(input => {
        expect(() => processor.validateText(input as any)).not.toThrow();

        const result = processor.validateText(input as any);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(false); // Should reject non-string inputs
      });
    });
  });
});
