import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

interface EventRequest {
  context: {
    player: { name: string; socialClass: string; stats: { charisma: number; piety: number; currency: number; health: number; reputation: number; wealth: number } };
    npc?: { name: string; profession: string; socialClass: string; disposition: number; panic: number; religion: string };
    environment: { district: string; timeOfDay: number; weather: string };
    conversation?: { playerMessages: string[]; npcMessages: string[] };
  };
  eventSeed?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { context, eventSeed } = req.body as EventRequest;
  if (!context) {
    return res.status(400).json({ error: 'Missing context' });
  }

  const systemPrompt = [
    'You generate short in-world decision events for a historical simulation set in Damascus, 1348.',
    'Return JSON only, matching this schema:',
    '{ "title": string, "body": string, "options": [ { "id": string, "label": string, "effectKey": string, "outcomeText"?: string, "followupEventId"?: string, "requirements": { "stat"?: "charisma"|"piety"|"currency"|"health"|"reputation"|"wealth", "min"?: number, "max"?: number } } ] }',
    'Rules:',
    '- 2 to 4 options only.',
    '- Keep body under 3 sentences.',
    '- Use period-appropriate language.',
    '- effectKey must be one of: "end_conversation", "bribe_small", "bribe_large", "flee", "appeal_faith", "calm_crowd", "escalate", "health_up", "health_down", "reputation_up", "reputation_down", "wealth_up", "wealth_down".',
    eventSeed ? `- Event seed: ${eventSeed}` : ''
  ].filter(Boolean).join('\n');

  try {
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
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(context) }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 350,
          temperature: 0.7,
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
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    return res.status(200).json({ response: responseText });
  } catch (error) {
    console.error('Event API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
