import { TextChunk, IFRAME_SELECTORS } from '@/types/tts';

export interface ITextExtractionService {
    extractTextChunks(): Promise<TextChunk[]>;
    getCurrentReaderElement(): HTMLElement | null;
}

export class EpubTextExtractionService implements ITextExtractionService {
    async extractTextChunks(): Promise<TextChunk[]> {
        try {
            const readerElement = this.getCurrentReaderElement();
            if (!readerElement) {
                throw new Error('Cannot access reader content');
            }

            const textNodes = this.getAllTextNodes(readerElement);
            const chunks: TextChunk[] = [];

            textNodes.forEach((node) => {
                const text = node.textContent?.trim();
                if (text && text.length > 0) {
                    chunks.push({
                        text: text,
                        element: node.parentElement?.tagName || undefined,
                    });
                }
            });

            return chunks;
        } catch (error) {
            console.error('Error extracting text with elements:', error);
            const fallbackText = await this.extractFallbackText();
            return [{
                text: fallbackText,
                element: 'fallback'
            }];
        }
    }

    getCurrentReaderElement(): HTMLElement | null {
        for (const selector of IFRAME_SELECTORS) {
            const iframes = document.querySelectorAll(selector) as NodeListOf<HTMLIFrameElement>;

            for (const iframe of iframes) {
                try {
                    const style = window.getComputedStyle(iframe);
                    const isVisible = style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        style.opacity !== '0';

                    if (isVisible && iframe.contentDocument) {
                        return iframe.contentDocument.body;
                    }
                } catch (error) {
                    console.debug('Cannot access iframe:', error instanceof Error ? error.message : String(error));
                    continue;
                }
            }
        }

        console.warn('No accessible iframe found');
        return null;
    }

    private getAllTextNodes(element: Element): Node[] {
        const textNodes: Node[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim();
                    return text && text.length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    private async extractFallbackText(): Promise<string> {
        try {
            const readerIframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;

            if (readerIframe && readerIframe.contentDocument) {
                const textContent = readerIframe.contentDocument.body.innerText;

                if (!textContent || textContent.trim().length === 0) {
                    return "No text content found in current view.";
                }

                const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
                let result = '';
                for (const sentence of sentences) {
                    if ((result + sentence).length > 1000) break;
                    result += sentence.trim() + '. ';
                }

                return result.trim() || "No readable text found.";
            }

            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                return selection.toString().trim();
            }

            return "Unable to extract text from current position.";
        } catch (error) {
            console.error('Error extracting fallback text:', error);
            return "Error extracting text from current view.";
        }
    }
}
