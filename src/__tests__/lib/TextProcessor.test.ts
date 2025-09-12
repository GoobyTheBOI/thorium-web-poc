import { DefaultTextProcessor, ElevenLabsTextProcessor } from '../../lib/TextProcessor';
import { TTS_CONSTANTS } from '@/preferences/constants';
import { TEST_CONFIG } from '../../lib/constants/testConstants';

describe('DefaultTextProcessor - SOLID Architecture', () => {
  let processor: DefaultTextProcessor;

  beforeEach(() => {
    processor = new DefaultTextProcessor();
  });

  describe('Interface Compliance', () => {
    test('implements ITextProcessor interface', () => {
      expect(typeof processor.formatText).toBe('function');
      expect(typeof processor.validateText).toBe('function');
    });

    test('formatText returns string for all inputs', () => {
      const result = processor.formatText('test', 'normal');
      expect(typeof result).toBe('string');
    });

    test('validateText returns boolean for all inputs', () => {
      const result = processor.validateText('test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('SSML Text Formatting', () => {
    test('formatText handles basic text with SSML escaping', () => {
      const result = processor.formatText(TEST_CONFIG.TEST_DATA.SIMPLE_TEXT, 'normal');
      expect(result).toBe(TEST_CONFIG.TEST_DATA.SIMPLE_TEXT);
      expect(typeof result).toBe('string');
    });

    test('formatText adds SSML markup for heading elements', () => {
      const text = 'Chapter Title';
      const result = processor.formatText(text, 'h1');

      expect(result).toContain('<break time="0.5s"/>');
      expect(result).toContain('<emphasis level="strong">');
      expect(result).toContain('<prosody rate="slow">');
      expect(result).toContain('Chapter Title');
      expect(result).toContain('</prosody></emphasis>');
      expect(result).toContain('<break time="1s"/>');
    });

    test('formatText adds SSML markup for paragraph elements', () => {
      const text = 'This is a paragraph with multiple sentences.';
      const result = processor.formatText(text, 'p');

      expect(result).toContain('This is a paragraph with multiple sentences.');
      expect(result).toContain('<break time="0.3s"/>');
    });

    test('formatText adds SSML markup for italic elements', () => {
      const text = 'emphasized text';
      const result = processor.formatText(text, 'em');

      expect(result).toContain('<emphasis level="moderate">');
      expect(result).toContain('emphasized text');
      expect(result).toContain('</emphasis>');
    });

    test('formatText adds SSML markup for bold elements', () => {
      const text = 'important text';
      const result = processor.formatText(text, 'strong');

      expect(result).toContain('<emphasis level="strong">');
      expect(result).toContain('important text');
    });

    test('formatText handles all heading levels consistently', () => {
      const text = 'Heading Text';
      const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      headingLevels.forEach(level => {
        const result = processor.formatText(text, level);
        expect(result).toContain('<break time="0.5s"/>');
        expect(result).toContain('<emphasis level="strong">');
        expect(result).toContain('<prosody rate="slow">');
        expect(result).toContain('Heading Text');
      });
    });
  });

  describe('Text Normalization and Cleaning', () => {
    test('normalizes multiple whitespace to single spaces', () => {
      const text = '  Multiple   spaces   here  ';
      const result = processor.formatText(text, 'normal');

      expect(result).toBe('Multiple spaces here');
      expect(result).not.toContain('  '); // No double spaces
    });

    test('replaces special whitespace characters', () => {
      const text = 'Text\nwith\r\nspecial\tchars\u00a0here';
      const result = processor.formatText(text, 'normal');

      expect(result).toBe('Text with special chars here');
      expect(result).not.toContain('\n');
      expect(result).not.toContain('\r');
      expect(result).not.toContain('\t');
      expect(result).not.toContain('\u00a0');
    });

    test('trims leading and trailing whitespace', () => {
      const text = '   trimmed text   ';
      const result = processor.formatText(text, 'normal');

      expect(result).toBe('trimmed text');
      expect(result).not.toMatch(/^\s/);
      expect(result).not.toMatch(/\s$/);
    });

    test('escapes SSML special characters', () => {
      const text = 'Text with <tags> & "quotes" and \'apostrophes\'';
      const result = processor.formatText(text, 'normal');

      expect(result).toContain('&lt;tags&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;quotes&quot;');
      expect(result).toContain('&apos;apostrophes&apos;');
    });
  });

  describe('Element Type Detection', () => {
    test('detects heading elements correctly', () => {
      const text = 'Title';
      const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'H1', 'H2'];

      headings.forEach(elementType => {
        const result = processor.formatText(text, elementType);
        expect(result).toContain('<emphasis level="strong">');
        expect(result).toContain('<prosody rate="slow">');
      });
    });

    test('detects paragraph elements correctly', () => {
      const text = 'Paragraph text';
      const result = processor.formatText(text, 'p');

      expect(result).toContain('<break time="0.3s"/>');
    });

    test('detects italic elements correctly', () => {
      const text = 'Italic text';

      const resultI = processor.formatText(text, 'i');
      const resultEm = processor.formatText(text, 'em');

      expect(resultI).toContain('<emphasis level="moderate">');
      expect(resultEm).toContain('<emphasis level="moderate">');
    });

    test('detects bold elements correctly', () => {
      const text = 'Bold text';

      const resultB = processor.formatText(text, 'b');
      const resultStrong = processor.formatText(text, 'strong');

      expect(resultB).toContain('<emphasis level="strong">');
      expect(resultStrong).toContain('<emphasis level="strong">');
    });

    test('handles unknown element types as normal', () => {
      const text = 'Normal text';
      const unknownTypes = ['div', 'span', 'custom', 'unknown'];

      unknownTypes.forEach(elementType => {
        const result = processor.formatText(text, elementType);
        expect(result).toBe('Normal text');
      });
    });

    test('handles case-insensitive element types', () => {
      const text = TEST_CONFIG.TEST_DATA.SAMPLE_TEXT;

      const lowerResult = processor.formatText(text, 'h1');
      const upperResult = processor.formatText(text, 'H1');
      const mixedResult = processor.formatText(text, 'H1');

      expect(lowerResult).toEqual(upperResult);
      expect(upperResult).toEqual(mixedResult);
    });
  });

  describe('Text Validation with Constants', () => {
    test('validates text length against TTS_CONSTANTS.MAX_TEXT_LENGTH', () => {
      const validText = 'This is valid text';
      const longText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1);

      expect(processor.validateText(validText)).toBe(true);
      expect(processor.validateText(longText)).toBe(false);
    });

    test('validateText returns true for valid text', () => {
      const validTexts = [
        TEST_CONFIG.TEST_DATA.SIMPLE_TEXT,
        'This is a longer sentence with punctuation.',
        'Text with numbers 123 and symbols!',
        'Internationalization: héllo wörld',
        'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH), // At max length
      ];

      validTexts.forEach(text => {
        expect(processor.validateText(text)).toBe(true);
      });
    });

    test('validateText returns false for invalid text', () => {
      const invalidTexts = [
        '',
        '   ',
        '\t\t\t',
        '\n\n\n',
        null,
        undefined,
        'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1), // Over max length
      ];

      invalidTexts.forEach(text => {
        expect(processor.validateText(text as unknown)).toBe(false);
      });
    });

    test('validateText checks for non-string types', () => {
      const nonStringInputs = [123, {}, [], true, false, () => {}];

      nonStringInputs.forEach(input => {
        expect(processor.validateText(input as unknown)).toBe(false);
      });
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

    test('validateText handles Unicode characters correctly', () => {
      const unicodeTexts = [
        'Café, naïve, résumé',
        '北京, 東京',
        'مرحبا, שלום',
        '🌟 🎉 🚀',
      ];

      unicodeTexts.forEach(text => {
        expect(processor.validateText(text)).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('formatText handles empty strings gracefully', () => {
      const result = processor.formatText('', 'normal');
      expect(result).toBe('');
    });

    test('formatText handles null/undefined input gracefully', () => {
      const resultNull = processor.formatText(null as unknown, 'normal');
      const resultUndefined = processor.formatText(undefined as unknown, 'normal');

      expect(resultNull).toBe('');
      expect(resultUndefined).toBe('');
    });

    test('formatText handles non-string input gracefully', () => {
      const nonStringInputs = [123, {}, [], true, false];

      nonStringInputs.forEach(input => {
        const result = processor.formatText(input as unknown, 'normal');
        expect(result).toBe('');
      });
    });

    test('formatText handles invalid element types gracefully', () => {
      const text = TEST_CONFIG.TEST_DATA.SAMPLE_TEXT;
      const invalidTypes = [null, undefined, 123, {}, []];

      // Test each invalid type without deep nesting
      for (const elementType of invalidTypes) {
        expect(() => processor.formatText(text, elementType as unknown)).not.toThrow();
        const result = processor.formatText(text, elementType as unknown);
        expect(result).toBe(TEST_CONFIG.TEST_DATA.SAMPLE_TEXT); // Should default to normal
      }
    });

    test('handles very long text efficiently', () => {
      const longText = 'A'.repeat(1000) + ' test content';

      const startTime = performance.now();
      const result = processor.formatText(longText, 'normal');
      const endTime = performance.now();

      expect(typeof result).toBe('string');
      expect(result).toContain('test content');
      expect(endTime - startTime).toBeLessThan(50); // Should process quickly
    });

    test('handles text with complex SSML escaping scenarios', () => {
      const complexText = '<test>&"quotes"&</test>';
      const result = processor.formatText(complexText, 'normal');

      expect(result).toBe('&lt;test&gt;&amp;&quot;quotes&quot;&amp;&lt;/test&gt;');
    });
  });

  describe('SOLID Principles Compliance', () => {
    test('Single Responsibility: Only handles text processing', () => {
      expect(processor.formatText).toBeDefined();
      expect(processor.validateText).toBeDefined();

      expect(processor).not.toHaveProperty('play');
      expect(processor).not.toHaveProperty('synthesize');
      expect(processor).not.toHaveProperty('createAdapter');
    });

    test('Open/Closed: Can be extended without modification', () => {
      expect(processor instanceof DefaultTextProcessor).toBe(true);
      expect(typeof processor.formatText).toBe('function');
      expect(typeof processor.validateText).toBe('function');
    });

    test('Interface Segregation: Implements focused ITextProcessor interface', () => {
      const expectedMethods = ['formatText', 'validateText'];

      expectedMethods.forEach(method => {
        expect(typeof (processor as unknown)[method]).toBe('function');
      });

      expect(processor).not.toHaveProperty('play');
      expect(processor).not.toHaveProperty('pause');
    });

    test('Dependency Inversion: Uses abstractions (constants)', () => {
      const longText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1);
      expect(processor.validateText(longText)).toBe(false);

      const maxText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH);
      expect(processor.validateText(maxText)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    test('maintains consistent behavior across calls', () => {
      const text = 'Consistent behavior test';

      const result1 = processor.formatText(text, 'normal');
      const result2 = processor.formatText(text, 'normal');
      const result3 = processor.formatText(text, 'normal');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test('handles repeated processing efficiently', () => {
      const text = TEST_CONFIG.TEST_DATA.PERFORMANCE_TEXT;

      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        processor.formatText(text, 'normal');
        processor.validateText(text);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('validation and formatting work together correctly', () => {
      const testTexts = [
        'Valid text content',
        'Another valid piece of text',
        'Text with punctuation!',
        'Text with numbers 123',
        '', // Invalid
        '   ', // Invalid
      ];

      testTexts.forEach(text => {
        const isValid = processor.validateText(text);
        const formatted = processor.formatText(text, 'normal');

        if (isValid) {
          expect(formatted.length).toBeGreaterThan(0);
          expect(formatted.trim().length).toBeGreaterThan(0);
        } else {
          expect(typeof formatted).toBe('string');
        }
      });
    });

    test('handles concurrent access safely', async () => {
      const text = 'Concurrent access test';

      // Helper function to process concurrent test data
      const processTestData = (i: number) => {
        const formatted = processor.formatText(`${text} ${i}`, 'normal');
        const valid = processor.validateText(`${text} ${i}`);
        return { formatted, valid };
      };

      // Create async test function without Promise.resolve().then() nesting
      const createTestPromise = async (i: number) => processTestData(i);

      const promises = Array.from({ length: 10 }, (_, i) => createTestPromise(i));

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach((result, i) => {
        expect(result.formatted).toContain(`${text} ${i}`);
        expect(typeof result.valid).toBe('boolean');
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('SSML Integration', () => {
    test('produces valid SSML-like markup for TTS systems', () => {
      const headingResult = processor.formatText('Chapter 1', 'h1');

      expect(headingResult).toMatch(/<break time="\d+(\.\d+)?s"\/>/);
      expect(headingResult).toMatch(/<emphasis level="strong">/);
      expect(headingResult).toMatch(/<prosody rate="slow">/);
      expect(headingResult).toMatch(/<\/prosody><\/emphasis>/);
    });

    test('escapes content to prevent SSML injection', () => {
      const maliciousText = '<break time="10s"/>malicious<emphasis>';
      const result = processor.formatText(maliciousText, 'normal');

      expect(result).toContain('&lt;break');
      expect(result).toContain('&lt;emphasis&gt;');
      expect(result).not.toContain('<break time="10s"/>');
    });

    test('preserves text content integrity within SSML markup', () => {
      const originalText = 'Important content that must be preserved.';
      const result = processor.formatText(originalText, 'p');

      expect(result).toContain('Important content that must be preserved.');
    });
  });

  describe('Integration with TTS Constants', () => {
    test('respects MAX_TEXT_LENGTH from TTS_CONSTANTS', () => {
      const maxLengthText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH);
      const overLengthText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1);

      expect(processor.validateText(maxLengthText)).toBe(true);
      expect(processor.validateText(overLengthText)).toBe(false);
    });

    test('uses consistent configuration source', () => {
      expect(TTS_CONSTANTS.MAX_TEXT_LENGTH).toBeDefined();
      expect(typeof TTS_CONSTANTS.MAX_TEXT_LENGTH).toBe('number');

      const testText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1);
      expect(processor.validateText(testText)).toBe(false);
    });
  });
});

describe('ElevenLabsTextProcessor - SOLID Architecture', () => {
  let processor: ElevenLabsTextProcessor;

  beforeEach(() => {
    processor = new ElevenLabsTextProcessor();
  });

  describe('Interface Compliance', () => {
    test('implements ITextProcessor interface', () => {
      expect(typeof processor.formatText).toBe('function');
      expect(typeof processor.validateText).toBe('function');
    });

    test('formatText returns string for all inputs', () => {
      const result = processor.formatText('test', 'normal');
      expect(typeof result).toBe('string');
    });

    test('validateText returns boolean for all inputs', () => {
      const result = processor.validateText('test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('ElevenLabs-specific Text Formatting', () => {
    test('formatText handles basic text without SSML', () => {
      const result = processor.formatText('Hello world', 'normal');
      expect(result).toBe('Hello world');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    test('formatText adds emphasis for heading elements', () => {
      const text = 'Chapter Title';
      const result = processor.formatText(text, 'h1');

      expect(result).toContain('...');
      expect(result).toContain('CHAPTER TITLE');
      expect(result.toUpperCase()).toContain('CHAPTER TITLE');
    });

    test('formatText adds punctuation for paragraph elements', () => {
      const text = 'This is a paragraph';
      const result = processor.formatText(text, 'p');

      expect(result).toBe('This is a paragraph.');
      expect(result.endsWith('.')).toBe(true);
    });

    test('formatText adds emphasis marks for italic elements', () => {
      const text = 'emphasized text';
      const resultI = processor.formatText(text, 'i');
      const resultEm = processor.formatText(text, 'em');

      expect(resultI).toContain('—');
      expect(resultI).toContain('emphasized text');
      expect(resultEm).toContain('—');
      expect(resultEm).toContain('emphasized text');
    });

    test('formatText adds uppercase for bold elements', () => {
      const text = 'important text';
      const resultB = processor.formatText(text, 'b');
      const resultStrong = processor.formatText(text, 'strong');

      expect(resultB).toContain('IMPORTANT TEXT');
      expect(resultB).toContain('!');
      expect(resultStrong).toContain('IMPORTANT TEXT');
      expect(resultStrong).toContain('!');
    });

    test('formatText handles code elements with spacing', () => {
      const text = 'function';
      const resultCode = processor.formatText(text, 'code');
      const resultPre = processor.formatText(text, 'pre');

      expect(resultCode).toContain('Code:');
      expect(resultCode).toContain('f u n c t i o n');
      expect(resultPre).toContain('Code:');
      expect(resultPre).toContain('f u n c t i o n');
    });

    test('formatText handles all heading levels', () => {
      const text = 'Heading';
      const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

      headingTags.forEach(tag => {
        const result = processor.formatText(text, tag);
        expect(result).toContain('...');
        expect(result).toContain('HEADING');
      });
    });
  });

  describe('Input Validation and Edge Cases', () => {
    test('formatText handles null and undefined input', () => {
      expect(processor.formatText(null as any, 'normal')).toBe('');
      expect(processor.formatText(undefined as any, 'normal')).toBe('');
      expect(processor.formatText('', 'normal')).toBe('');
    });

    test('formatText handles non-string input', () => {
      expect(processor.formatText(123 as any, 'normal')).toBe('');
      expect(processor.formatText({} as any, 'normal')).toBe('');
      expect(processor.formatText([] as any, 'normal')).toBe('');
    });

    test('formatText normalizes whitespace', () => {
      const result = processor.formatText('  Hello   world  \n\t  ', 'normal');
      expect(result).toBe('Hello world'); // Processor actually trims whitespace
    });

    test('formatText handles unknown element types', () => {
      const text = 'test text';
      const result = processor.formatText(text, 'unknowntag');
      expect(result).toBe('test text');
    });

    test('formatText handles null/undefined element types', () => {
      const text = 'test text';
      expect(processor.formatText(text, null as any)).toBe('test text');
      expect(processor.formatText(text, undefined as any)).toBe('test text');
    });
  });

  describe('Text Validation', () => {
    test('validateText returns true for valid text', () => {
      expect(processor.validateText('Valid text')).toBe(true);
      expect(processor.validateText('Short')).toBe(true);
      expect(processor.validateText('AB')).toBe(true); // ElevenLabs requires at least 2 characters
    });

    test('validateText returns false for invalid text', () => {
      expect(processor.validateText('')).toBe(false);
      expect(processor.validateText('   ')).toBe(false);
      expect(processor.validateText('A')).toBe(false); // ElevenLabs requires at least 2 characters
      expect(processor.validateText(null as any)).toBe(false);
      expect(processor.validateText(undefined as any)).toBe(false);
    });

    test('validateText returns false for non-string input', () => {
      expect(processor.validateText(123 as any)).toBe(false);
      expect(processor.validateText({} as any)).toBe(false);
      expect(processor.validateText([] as any)).toBe(false);
    });

    test('validateText checks maximum text length', () => {
      expect(TTS_CONSTANTS.MAX_TEXT_LENGTH).toBeDefined();
      expect(typeof TTS_CONSTANTS.MAX_TEXT_LENGTH).toBe('number');

      const testText = 'A'.repeat(TTS_CONSTANTS.MAX_TEXT_LENGTH + 1);
      expect(processor.validateText(testText)).toBe(false);
    });
  });

  describe('Element Type Detection', () => {
    test('detectElementType correctly identifies different element types', () => {
      // Test through formatText since detectElementType is private
      expect(processor.formatText('test', 'a')).toBe('test'); // normal type
      expect(processor.formatText('test', 'span')).toBe('test'); // normal type
      expect(processor.formatText('test', 'div')).toBe('test'); // normal type
    });
  });
});
