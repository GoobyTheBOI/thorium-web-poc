import type { NextApiRequest, NextApiResponse } from 'next';
import { VoiceInfo } from '../../../../preferences/types';
import type { IVoiceJson as AzureVoiceInfo } from 'microsoft-cognitiveservices-speech-sdk';

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VoiceInfo[] | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.AZURE_API_KEY || !process.env.AZURE_REGION) {
      console.error('Azure Speech credentials not configured');
      return res.status(500).json({
        error: 'Azure Speech API not configured'
      });
    }

    const region = process.env.AZURE_REGION;
    const apiKey = process.env.AZURE_API_KEY;

    const voicesUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`;

    const response = await fetch(voicesUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Azure Speech API error: ${response.status} ${response.statusText}`);
    }

    const azureVoices: AzureVoiceInfo[] = await response.json();

    const voices: VoiceInfo[] = azureVoices.map((voice) => ({
      id: voice.ShortName,
      name: `${voice.LocalName} (${voice.LocaleName})`,
      language: voice.Locale,
      gender: voice.Gender.toLowerCase() as 'male' | 'female' | 'neutral'
    }));

    res.status(200).json(voices);

  } catch (error) {
    console.error('Error fetching Azure voices:', error);
    res.status(500).json({
      error: 'Failed to fetch voices from Azure Speech Service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
