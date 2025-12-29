import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

interface ChatRequest {
  systemPrompt: string;
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[];
  playerMessage: string;
}

interface ChatResponse {
  message: string;
  action: 'end_conversation' | null;
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

    const contents = [
      ...messages,
      {
        role: 'user' as const,
        parts: [{ text: playerMessage }]
      }
    ];

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemPrompt }]
        },
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

    // Try to parse as JSON (new structured format)
    // Expected: { "message": "dialogue", "action": null | "end_conversation" }
    try {
      // Strip markdown code blocks if present
      const cleanedText = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanedText) as ChatResponse;
      if (typeof parsed.message === 'string') {
        return res.status(200).json({
          response: parsed.message,
          action: parsed.action || null
        });
      }
    } catch {
      // Not valid JSON - return as plain text (backwards compatible)
    }

    // Fallback: return as plain text response
    return res.status(200).json({ response: responseText, action: null });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
