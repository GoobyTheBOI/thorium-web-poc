import { IFRAME_SELECTORS } from '@/preferences/constants';
import { TextChunk, WindowWithNavigationAPIs } from '@/preferences/types';
import { handleDevelopmentError } from '@/lib/utils/errorUtils';

export interface ITextExtractionService {
    extractTextChunks(): Promise<TextChunk[]>;
    getCurrentReaderElement(): HTMLElement | null;
    hasNextPage(): Promise<boolean>;
    navigateToNextPage(): Promise<boolean>;
}

export class EpubTextExtractionService implements ITextExtractionService {
    // Constants for better maintainability
    private static readonly FALLBACK_TEXT_LIMIT = 2000;
    private static readonly CHUNK_TEXT_LIMIT = 1000;

    async extractTextChunks(): Promise<TextChunk[]> {
        try {
            const readerElement = this.getCurrentReaderElement();
            if (!readerElement) {
                throw new Error('Cannot access reader content');
            }

            const chunks = await this.extractVisibleTextChunks(readerElement);

            // If no visible text found, use fallback strategy
            if (chunks.length === 0) {
                return await this.extractFallbackTextChunks(readerElement);
            }

            return chunks;
        } catch (error) {
            // Silently fall back to default text extraction on error
            handleDevelopmentError(error, 'Text Extraction Error');
            return await this.createFallbackChunk();
        }
    }

    getCurrentReaderElement(): HTMLElement | null {
        for (const selector of IFRAME_SELECTORS) {
            const element = this.findVisibleReaderIframe(selector);
            if (element) {
                return element;
            }
        }

        return null;
    }

    /**
     * Find a visible and accessible iframe for the given selector.
     */
    private findVisibleReaderIframe(selector: string): HTMLElement | null {
        const iframes = document.querySelectorAll(selector);

        for (const element of iframes) {
            const readerElement = this.tryGetReaderElementFromIframe(element);
            if (readerElement) {
                return readerElement;
            }
        }

        return null;
    }

    /**
     * Try to get the reader element from an iframe if it's visible and accessible.
     */
    private tryGetReaderElementFromIframe(element: Element): HTMLElement | null {
        if (!(element instanceof HTMLIFrameElement)) {
            return null;
        }

        try {
            if (this.isIframeVisible(element) && element.contentDocument) {
                return element.contentDocument.body;
            }
        } catch (error) {
            console.debug('Cannot access iframe:', error instanceof Error ? error.message : String(error));
        }

        return null;
    }

    /**
     * Check if an iframe is visible in the DOM.
     */
    private isIframeVisible(iframe: HTMLIFrameElement): boolean {
        const style = window.getComputedStyle(iframe);
        return style.visibility !== 'hidden' &&
               style.display !== 'none' &&
               style.opacity !== '0';
    }

    /**
     * Extract text chunks from elements that are currently visible in the viewport.
     */
    private async extractVisibleTextChunks(readerElement: HTMLElement): Promise<TextChunk[]> {
        const visibleTextNodes = this.getVisibleTextNodes(readerElement);
        return this.convertNodesToChunks(visibleTextNodes);
    }

    /**
     * Extract text chunks using fallback strategies when visible text is not found.
     */
    private async extractFallbackTextChunks(readerElement: HTMLElement): Promise<TextChunk[]> {
        console.debug('No visible text found, using fallback extraction');

        const allTextNodes = this.getAllTextNodes(readerElement);
        const totalTextLength = this.calculateTotalTextLength(allTextNodes);

        if (this.shouldIncludeAllText(totalTextLength)) {
            return this.convertNodesToChunks(allTextNodes);
        }

        return this.extractLimitedTextChunks(allTextNodes);
    }

    /**
     * Create a fallback chunk when all other extraction methods fail.
     */
    private async createFallbackChunk(): Promise<TextChunk[]> {
        const fallbackText = await this.extractFallbackText();
        return [{
            text: fallbackText,
            element: 'fallback'
        }];
    }

    /**
     * Convert text nodes to TextChunk objects.
     */
    private convertNodesToChunks(nodes: Node[]): TextChunk[] {
        const chunks: TextChunk[] = [];

        nodes.forEach((node) => {
            const text = node.textContent?.trim();
            if (this.isValidText(text)) {
                chunks.push({
                    text: text,
                    element: node.parentElement?.tagName || undefined,
                });
            }
        });

        return chunks;
    }

    /**
     * Calculate the total text length from a collection of nodes.
     */
    private calculateTotalTextLength(nodes: Node[]): number {
        return nodes.reduce((total, node) => total + (node.textContent?.length || 0), 0);
    }

    /**
     * Determine if all text should be included based on total length.
     */
    private shouldIncludeAllText(totalLength: number): boolean {
        return totalLength < EpubTextExtractionService.FALLBACK_TEXT_LIMIT;
    }

    /**
     * Extract a limited amount of text chunks to avoid overwhelming TTS.
     */
    private extractLimitedTextChunks(nodes: Node[]): TextChunk[] {
        const chunks: TextChunk[] = [];
        let accumulatedLength = 0;

        for (const node of nodes) {
            const text = node.textContent?.trim();
            if (this.isValidText(text)) {
                chunks.push({
                    text: text,
                    element: node.parentElement?.tagName || undefined,
                });
                accumulatedLength += text.length;

                if (accumulatedLength > EpubTextExtractionService.CHUNK_TEXT_LIMIT) {
                    break;
                }
            }
        }

        return chunks;
    }

    /**
     * Check if text is valid and non-empty.
     */
    private isValidText(text: string | undefined): text is string {
        return Boolean(text && text.length > 0);
    }

    /**
     * Get all text nodes from an element, regardless of visibility.
     */
    private getAllTextNodes(element: Element): Node[] {
        return this.createTextNodeWalker(element, () => NodeFilter.FILTER_ACCEPT);
    }

    /**
     * Get text nodes that are currently visible in the viewport.
     * This ensures we only read text from the current page, not the entire chapter.
     */
    private getVisibleTextNodes(element: Element): Node[] {
        return this.createTextNodeWalker(element, (node) => {
            const parentElement = node.parentElement;
            return parentElement && this.isElementInViewport(parentElement)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        });
    }

    /**
     * Create a TreeWalker for text nodes with custom filtering.
     */
    private createTextNodeWalker(
        element: Element,
        acceptNodeCallback: (node: Node) => number
    ): Node[] {
        const textNodes: Node[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const text = node.textContent?.trim();
                    if (!this.isValidText(text)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return acceptNodeCallback(node);
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    /**
     * Check if an element is currently visible in the viewport.
     * This helps determine which text should be read from the current page.
     */
    private isElementInViewport(element: Element): boolean {
        try {
            const rect = element.getBoundingClientRect();

            if (!this.isRectVisible(rect)) {
                return false;
            }

            const iframe = this.getOwnerIframe(element);
            return iframe ? this.isVisibleInIframe(rect, iframe) : this.isVisibleInWindow(rect);
        } catch (error) {
            console.debug('Error checking viewport visibility:', error);
            // If we can't determine visibility, include the element to be safe
            return true;
        }
    }

    /**
     * Check if a rectangle has visible dimensions.
     */
    private isRectVisible(rect: DOMRect): boolean {
        return rect.width > 0 && rect.height > 0;
    }

    /**
     * Get the iframe that owns the element, if any.
     */
    private getOwnerIframe(element: Element): HTMLIFrameElement | null {
        return element.ownerDocument?.defaultView?.frameElement as HTMLIFrameElement || null;
    }

    /**
     * Check if element is visible within an iframe's viewport.
     */
    private isVisibleInIframe(rect: DOMRect, iframe: HTMLIFrameElement): boolean {
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) return false;

        const viewportHeight = iframeWindow.innerHeight || iframe.clientHeight;
        const viewportWidth = iframeWindow.innerWidth || iframe.clientWidth;

        return this.isRectIntersectingViewport(rect, viewportWidth, viewportHeight);
    }

    /**
     * Check if element is visible within the main window's viewport.
     */
    private isVisibleInWindow(rect: DOMRect): boolean {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

        return this.isRectIntersectingViewport(rect, viewportWidth, viewportHeight);
    }

    /**
     * Check if a rectangle intersects with the viewport (more lenient than fully contained).
     */
    private isRectIntersectingViewport(rect: DOMRect, viewportWidth: number, viewportHeight: number): boolean {
        return (
            rect.bottom > 0 &&
            rect.top < viewportHeight &&
            rect.right > 0 &&
            rect.left < viewportWidth
        );
    }

    private async extractFallbackText(): Promise<string> {
        try {
            const readerIframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;

            if (readerIframe?.contentDocument) {
                // Try to get text from currently visible elements first
                const visibleText = this.extractVisibleText(readerIframe.contentDocument.body);

                if (visibleText && visibleText.trim().length > 0) {
                    return this.limitTextLength(visibleText);
                }

                // Fallback to full content if no visible text found
                const textContent = readerIframe.contentDocument.body.innerText;

                if (!textContent || textContent.trim().length === 0) {
                    return "No text content found in current view.";
                }

                return this.limitTextLength(textContent);
            }

            const selection = window.getSelection();
            if (selection?.toString().trim()) {
                return selection.toString().trim();
            }

            return "Unable to extract text from current position.";
        } catch (error) {
            // Silently handle fallback text extraction errors
            handleDevelopmentError(error, 'Fallback Text Extraction Error');
            return "Error extracting text from current view.";
        }
    }

    /**
     * Extract text from elements that are currently visible in the viewport.
     */
    private extractVisibleText(rootElement: Element): string {
        const visibleElements: Element[] = [];
        const walker = document.createTreeWalker(
            rootElement,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    const element = node as Element;
                    if (this.isElementInViewport(element) && element.textContent?.trim()) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            visibleElements.push(node as Element);
        }

        // Extract text from visible elements, prioritizing block-level elements
        const textParts: string[] = [];
        visibleElements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && !textParts.some(existing => existing.includes(text))) {
                textParts.push(text);
            }
        });

        return textParts.join(' ');
    }

    /**
     * Limit text to a reasonable length for TTS processing.
     */
    private limitTextLength(text: string): string {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let result = '';
        for (const sentence of sentences) {
            if ((result + sentence).length > 1000) break;
            result += sentence.trim() + '. ';
        }

        return result.trim() || "No readable text found.";
    }

    /**
     * Check if there is a next page available for navigation.
     */
    async hasNextPage(): Promise<boolean> {
        try {
            const nextButton = this.findNextPageButton();
            if (nextButton) {
                // Check if button is enabled (not disabled)
                return !nextButton.hasAttribute('disabled') &&
                       !nextButton.classList.contains('disabled') &&
                       nextButton.style.display !== 'none';
            }

            // Alternative: Check for keyboard navigation support
            return this.supportsKeyboardNavigation();
        } catch (error) {
            console.debug('Error checking for next page:', error);
            return false;
        }
    }

    /**
     * Navigate to the next page in the ePub.
     */
    async navigateToNextPage(): Promise<boolean> {
        const nextButton = this.findNextPageButton();
        if (nextButton && await this.clickNextButton(nextButton)) {
            return true;
        }

        if (await this.tryKeyboardNavigation()) {
            return true;
        }

        if (await this.tryThoriumNavigation()) {
            return true;
        }

        return false;
    }

    /**
     * Find the next page button in the Thorium interface.
     */
    private findNextPageButton(): HTMLElement | null {
        // Common selectors for next page buttons in Thorium
        const selectors = [
            'button[title*="next"]',
            'button[aria-label*="Go forward"]',
            'button[title*="Next"]',
            'button[aria-label*="Next"]',
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button) {
                return button;
            }
        }

        return null;
    }

    /**
     * Click the next button and wait for navigation.
     */
    private async clickNextButton(button: HTMLElement): Promise<boolean> {
        try {
            const oldUrl = window.location.href;
            button.click();

            // Wait for URL change or content change
            return await this.waitForNavigation(oldUrl);
        } catch (error) {
            // Silently handle navigation click errors
            handleDevelopmentError(error, 'Navigation Click Error');
            return false;
        }
    }

    /**
     * Try keyboard navigation (Right Arrow key).
     */
    private async tryKeyboardNavigation(): Promise<boolean> {
        try {
            const oldUrl = window.location.href;

            // Try focusing on the iframe first
            const readerElement = this.getCurrentReaderElement();
            if (readerElement) {
                readerElement.focus();
            }

            // Send Right Arrow key event
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                code: 'ArrowRight',
                bubbles: true,
                cancelable: true
            });

            document.dispatchEvent(keyEvent);

            // Also try on the iframe
            if (readerElement) {
                readerElement.dispatchEvent(keyEvent);
            }

            return await this.waitForNavigation(oldUrl);
        } catch (error) {
            // Silently handle keyboard navigation errors
            handleDevelopmentError(error, 'Keyboard Navigation Error');
            return false;
        }
    }

    /**
     * Try Thorium-specific navigation methods.
     */
    private async tryThoriumNavigation(): Promise<boolean> {
        try {
            const win = window as WindowWithNavigationAPIs;

            // Try common Thorium navigation methods
            if (win.thorium?.reader?.nextPage) {
                await win.thorium.reader.nextPage();
                return true;
            }

            if (win.readium?.navigator?.next) {
                await win.readium.navigator.next();
                return true;
            }

            // Try postMessage to iframe
            const iframe = document.querySelector('iframe[title="Readium"]') as HTMLIFrameElement;
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ action: 'nextPage' }, window.location.origin);
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            }

            return false;
        } catch (error) {
            // Silently handle Thorium navigation errors
            handleDevelopmentError(error, 'Thorium Navigation Error');
            return false;
        }
    }

    /**
     * Check if keyboard navigation is supported.
     */
    private supportsKeyboardNavigation(): boolean {
        // Assume keyboard navigation is available if we have an active reader
        return this.getCurrentReaderElement() !== null;
    }

    /**
     * Wait for page navigation to complete.
     */
    private async waitForNavigation(oldUrl: string): Promise<boolean> {
        const maxWait = 3000; // 3 seconds max wait
        const checkInterval = 100; // Check every 100ms
        let waited = 0;

        while (waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;

            // Check if URL changed
            if (window.location.href !== oldUrl) {
                return true;
            }

            // Check if content changed (new text available)
            const newChunks = await this.extractTextChunks();
            if (newChunks.length > 0) {
                return true;
            }
        }

        return false;
    }
}
