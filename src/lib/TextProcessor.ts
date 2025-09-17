import { ElementType } from '@/preferences/types';
import { TTS_CONSTANTS } from '@/preferences/constants';
import type { ITextProcessor } from '@/preferences/types';

export class DefaultTextProcessor implements ITextProcessor {
    formatText(text: string, elementType: string): string {
        // Handle null/undefined input gracefully
        if (!text || typeof text !== 'string') {
            return '';
        }

        // Normalize whitespace and clean text
        const normalizedText = text
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[\n\r\t\u00a0]/g, ' ') // Replace special characters with space
            .trim();

        const cleanText = this.escapeSSML(normalizedText);
        const detectedType = this.detectElementType(elementType);


        switch (detectedType) {
            case 'heading':
                // Add pauses and emphasis for headings using SSML
                return `<break time="0.5s"/><emphasis level="strong"><prosody rate="slow">${cleanText}</prosody></emphasis><break time="1s"/>`;

            case 'paragraph':
                // Add natural breaks for paragraphs
                return `${cleanText}<break time="0.3s"/>`;
            case 'italic':
                return `<emphasis level="moderate">${cleanText}</emphasis>`;
            case 'bold':
                return `<emphasis level="strong">${cleanText}</emphasis>`;
            case 'code':
                return `<emphasis level="moderate">${cleanText}</emphasis>`;
            default:
                return cleanText;
        }
    }

    validateText(text: string): boolean {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return false;
        }

        if (text.length > TTS_CONSTANTS.MAX_TEXT_LENGTH) {
            return false;
        }

        return true;
    }

    private escapeSSML(text: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }
        return text.replace(/[<>&"']/g, (match) => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return match;
            }
        });
    }

    private readonly detectElementType = (element?: string): ElementType => {
        if (!element || typeof element !== 'string') {
            return 'normal';
        }

        const tagName = element.toLowerCase();

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return 'heading';
        } else if (tagName === 'p') {
            return 'paragraph';
        } else if (tagName === 'i' || tagName === 'em') {
            return 'italic';
        } else if (tagName === 'b' || tagName === 'strong') {
            return 'bold';
        } else if (tagName === 'code' || tagName === 'pre' || tagName === 'kbd' || tagName === 'samp') {
            return 'code';
        } else if (tagName === 'a') {
            return 'normal';
        }

        return 'normal';
    }
}

/**
 * ElevenLabs-specific text processor that converts SSML-style formatting
 * to text modifications that work better with ElevenLabs TTS
 */
export class ElevenLabsTextProcessor implements ITextProcessor {
    formatText(text: string, elementType: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }

        const normalizedText = text
            .replace(/\s+/g, ' ')
            .replace(/[\n\r\t\u00a0]/g, ' ')
            .trim();

        const detectedType = this.detectElementType(elementType);

        switch (detectedType) {
            case 'heading':
                return `... ${normalizedText.toUpperCase()} ...`;

            case 'paragraph':
                return `${normalizedText}.`;

            case 'italic':
                return `— ${normalizedText} —`;

            case 'bold':
                return `${normalizedText.toUpperCase()}!`;

            case 'code': {
                // Space out characters for better code pronunciation
                const spacedText = normalizedText.split('').join(' ');
                return `Code: ${spacedText}`;
            }

            default:
                return normalizedText;
        }
    }

    validateText(text: string): boolean {
        // ElevenLabs-specific validation with additional checks
        if (!text || typeof text !== 'string') {
            return false;
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
            return false;
        }

        // ElevenLabs has slightly more restrictive length limits
        if (text.length > TTS_CONSTANTS.MAX_TEXT_LENGTH) {
            return false;
        }

        // Additional check for minimum length to ensure quality synthesis
        if (trimmedText.length < 2) {
            return false;
        }

        return true;
    }

    private readonly detectElementType = (element?: string): ElementType => {
        if (!element || typeof element !== 'string') {
            return 'normal';
        }

        const tagName = element.toLowerCase();

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return 'heading';
        } else if (tagName === 'p') {
            return 'paragraph';
        } else if (tagName === 'i' || tagName === 'em') {
            return 'italic';
        } else if (tagName === 'b' || tagName === 'strong') {
            return 'bold';
        } else if (tagName === 'code' || tagName === 'pre' || tagName === 'kbd' || tagName === 'samp') {
            return 'code';
        } else if (tagName === 'a') {
            return 'normal';
        }

        return 'normal';
    }
}
