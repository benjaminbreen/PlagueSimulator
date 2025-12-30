import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_API_URLS = [
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
  `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`,
];

interface ObserveRequest {
  prompt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { prompt } = req.body as ObserveRequest;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 180,
        temperature: 0.7,
        topP: 0.9,
        topK: 32
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    let response: Response | null = null;
    let errorText = '';
    for (const url of GEMINI_API_URLS) {
      response = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) break;
      errorText = await response.text();
      if (response.status !== 404) break;
    }

    if (!response || !response.ok) {
      console.error('Gemini API error:', errorText || 'Unknown error');
      return res.status(response?.status ?? 500).json({ error: 'Gemini API error', details: errorText });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    return res.status(200).json({ text: responseText });
  } catch (error) {
    console.error('Observe API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
