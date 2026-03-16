/**
 * AI Provider Functions - Using fetch() only, no external SDKs
 */

export async function callGemini(
  prompt: string,
  maxTokens: number = 1500
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.3,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No text in Gemini response')
  }

  return text
}

export async function callGroq(
  prompt: string,
  maxTokens: number = 800
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content

  if (!text) {
    throw new Error('No text in Groq response')
  }

  return text
}

export function parseJsonResponse(text: string): any {
  try {
    // Strip markdown code fences if present
    let cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return JSON.parse(cleaned)
  } catch (error) {
    throw new Error('AI returned invalid JSON')
  }
}
