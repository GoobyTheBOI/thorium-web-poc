import type { NextApiRequest, NextApiResponse } from 'next';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { Voice } from '@elevenlabs/elevenlabs-js/api';
import { VoiceInfo } from '@/preferences/types';

interface VoicesResponse {
    voices: VoiceInfo[];
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<VoicesResponse>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            voices: [],
            error: 'Method not allowed'
        });
    }

    try {
        if (!process.env.ELEVENLABS_API_KEY) throw new Error('ElevenLabs API key is not configured');

        const elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });

        const voicesResponse = await elevenlabs.voices.getAll();
        const allVoices = voicesResponse.voices.map((voice: Voice): VoiceInfo => ({
            id: voice.voiceId,
            name: voice.name || 'Unknown Voice',
            language: voice.labels?.language || 'unknown',
            gender: voice.labels?.gender as 'male' | 'female' | 'neutral' | undefined,
        }));

        return res.status(200).json({ voices: allVoices });

    } catch (error) {
        console.error('Error fetching voices from ElevenLabs:', error);
        return res.status(500).json({
            voices: [],
            error: 'Failed to fetch voices from ElevenLabs'
        });
    }
}
