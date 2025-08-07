import type { NextApiRequest, NextApiResponse } from 'next'
import { ElevenLabsAdapter } from "@/pages/adapters/ElevenLabsAdapter";

// Types
interface TextChunk {
    text: string;
    element?: string; // Changed from HTMLElement to string (tagName)
}

interface TTSRequestBody {
    text: TextChunk[];
    voiceId: string;
    modelId?: string;
    useContext?: boolean;
}

interface TTSErrorResponse {
    error: string;
    details?: string;
}

type ElementType = 'heading' | 'paragraph' | 'normal';


const validateRequestMethod = (req: NextApiRequest, res: NextApiResponse): boolean => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return false;
    }
    return true;
};

const detectElementType = (element?: string): ElementType => {
    if (!element) return 'normal';

    const tagName = element.toLowerCase();

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        return 'heading';
    } else if (tagName === 'p') {
        return 'paragraph';
    }

    return 'normal';
}

// Format text based on detected element type
const formatTextByType = (text: string, type: ElementType): string => {
    // Clean the text first to avoid SSML conflicts
    const cleanText = text.replace(/[<>&"']/g, (match) => {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return match;
        }
    });

    switch (type) {
        case 'heading':
            // Add pauses and emphasis for headings using SSML
            return `<speak><break time="0.5s"/><emphasis level="strong"><prosody rate="slow">${cleanText}</prosody></emphasis><break time="1s"/></speak>`;

        case 'paragraph':
            // Add natural breaks for paragraphs
            return `<speak>${cleanText}<break time="0.3s"/></speak>`;

        default:
            return cleanText;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Buffer | TTSErrorResponse>
) {
    if (!validateRequestMethod(req, res)) {
        return;
    }

    try {
        const { 
            text, 
            voiceId, 
            modelId = 'eleven_multilingual_v2',
            useContext = false 
        } = req.body as TTSRequestBody;

        if (!text || !Array.isArray(text) || text.length === 0) {
            throw new Error('Text is required and must be a non-empty array');
        }

        const elevenlabsAdapter = new ElevenLabsAdapter(voiceId, modelId);

        if (useContext && text.length > 1) {
            // Process multiple chunks with context continuity
            console.log(`Processing ${text.length} chunks with context continuity`);
            
            const requestIds: string[] = [];
            const audioBuffers: Buffer[] = [];

            // Process chunks SEQUENTIALLY for context continuity
            for (let i = 0; i < text.length; i++) {
                const chunk = text[i];
                const elementType = detectElementType(chunk.element);
                const formattedText = formatTextByType(chunk.text, elementType);

                console.log(`Processing chunk ${i + 1}/${text.length}: "${chunk.text.substring(0, 50)}..." (${elementType})`);

                const result = await elevenlabsAdapter.playWithRequestIds(
                    formattedText, 
                    requestIds.length > 0 ? requestIds : undefined
                );

                audioBuffers.push(result.audioBuffer);
                
                if (result.requestId) {
                    requestIds.push(result.requestId);
                }
            }

            const mergedBuffer = Buffer.concat(audioBuffers);
            console.log(`Context processing complete. Total audio size: ${mergedBuffer.length} bytes`);

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', mergedBuffer.length.toString());
            return res.status(200).send(mergedBuffer);

        } else {
            // Process single chunk or without context
            const chunk = text[0];
            const elementType = detectElementType(chunk.element);
            const formattedText = formatTextByType(chunk.text, elementType);
            
            console.log(`Processing single chunk: "${chunk.text.substring(0, 50)}..." (${elementType})`);
            
            const audioBuffer = await elevenlabsAdapter.play<Buffer>(formattedText);

            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', audioBuffer.length.toString());
            return res.status(200).send(audioBuffer);
        }

    } catch (error) {
        console.error('TTS API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            error: 'Failed to generate audio',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}
