import { ElementType, TTS_CONSTANTS } from '@/types/tts';
import type { ITextProcessor } from '@/preferences/types';

export class DefaultTextProcessor implements ITextProcessor {
    formatText(text: string, elementType: string): string {
        const cleanText = this.escapeSSML(text);
        const detectedType = this.detectElementType(elementType);

        console.log(`Formatting text: "${cleanText}" as type: ${detectedType}`);

        switch (detectedType) {
            case 'heading':
                // Add pauses and emphasis for headings using SSML
                return `<speak><break time="0.5s"/><emphasis level="strong"><prosody rate="slow">${cleanText}</prosody></emphasis><break time="1s"/>Hallo, dit is een test</speak>`;

            case 'paragraph':
                // Add natural breaks for paragraphs
                return `<speak>${cleanText}<break time="0.3s"/></speak>`;

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
        if (!element) return 'normal';

        const tagName = element.toLowerCase();

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return 'heading';
        } else if (tagName === 'p') {
            return 'paragraph';
        }

        return 'normal';
    }
}
