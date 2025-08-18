import { ElementType, TTS_CONSTANTS } from '@/types/tts';
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

        console.log(`Formatting text: "${cleanText}" as type: ${detectedType}`);

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
                return `<emphasis level="strong">${cleanText}`;

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

    private detectElementType = (element?: string): ElementType => {
        if (!element || typeof element !== 'string') return 'normal';

        const tagName = element.toLowerCase();

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return 'heading';
        } else if (tagName === 'p') {
            return 'paragraph';
        } else if (tagName === 'i' || tagName === 'em') {
            return 'italic';
        } else if (tagName === 'b' || tagName === 'strong') {
            return 'bold';
        }

        return 'normal';
    }
}
