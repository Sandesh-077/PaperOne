import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGemini, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const { mode, word, passage } = await req.json()

  if (!mode || !['word', 'passage'].includes(mode)) {
    return NextResponse.json({error: 'Mode must be "word" or "passage"'}, {status: 400})
  }

  try {
    if (mode === 'word') {
      if (!word || word.trim().length === 0) {
        return NextResponse.json({error: 'Word is required'}, {status: 400})
      }

      const prompt = `You are a vocabulary coach for Cambridge A-Level General Paper (8021) students. Teach this word in academic context.

Word: ${word}

Return ONLY valid JSON - no markdown, no explanation:
{
  "word": "${word}",
  "definition": "...clear definition...",
  "academicExample": "...sentence using word in academic context...",
  "synonyms": [
    { "word": "...", "nuance": "...how it differs..." },
    { "word": "...", "nuance": "..." }
  ],
  "gpTip": "...how this word impresses GP examiners..."
}`

      const responseText = await callGemini(prompt, 1000)
      const result = parseJsonResponse(responseText)
      return NextResponse.json(result)
    } else {
      // mode === 'passage'
      if (!passage || passage.trim().length === 0) {
        return NextResponse.json({error: 'Passage is required'}, {status: 400})
      }

      const prompt = `You are a vocabulary coach for Cambridge A-Level General Paper (8021) students. Improve the vocabulary in this passage.

Passage: ${passage}

Suggest 3-5 ways to replace repetitive or weak words with stronger academic vocabulary. For each suggestion, explain why the alternative is better.

Return ONLY valid JSON - no markdown, no explanation:
{
  "suggestions": [
    { "original": "...", "alternatives": ["...", "..."], "why": "...why better..." },
    { "original": "...", "alternatives": ["...", "..."], "why": "..." }
  ]
}`

      const responseText = await callGemini(prompt, 1000)
      const result = parseJsonResponse(responseText)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Error with vocabulary:', error)
    return NextResponse.json({error: 'Failed to process vocabulary'}, {status: 500})
  }
}
