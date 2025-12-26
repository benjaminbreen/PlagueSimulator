import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatRequest {
  systemPrompt: string;
  messages: GeminiMessage[];
  playerMessage: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { systemPrompt, messages, playerMessage } = req.body as ChatRequest;

    if (!systemPrompt || !playerMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build the conversation history with system prompt as first user message
    const contents: GeminiMessage[] = [
      // System prompt as initial context
      {
        role: 'user',
        parts: [{ text: systemPrompt + '\n\n[The conversation begins. A stranger approaches you.]' }]
      },
      {
        role: 'model',
        parts: [{ text: 'I understand. I am ready to speak as this character.' }]
      },
      // Previous messages
      ...messages,
      // Current player message
      {
        role: 'user',
        parts: [{ text: playerMessage }]
      }
    ];

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.85,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return res.status(response.status).json({ error: 'Gemini API error', details: errorText });
    }

    const data = await response.json();

    // Extract the response text
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    return res.status(200).json({ response: responseText });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
