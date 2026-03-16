import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const { text } = await req.json()

  if (!text || text.trim().length === 0) {
    return NextResponse.json({error: 'Text is required'}, {status: 400})
  }

  if (text.length > 2000) {
    return NextResponse.json({error: 'Text must be under 2000 characters'}, {status: 400})
  }

  try {
    const prompt = `You are an academic English teacher for Cambridge A-Level General Paper (8021) students.
Check this text for errors in formal academic English:

${text}

Check for: subject-verb agreement, tense consistency, article usage (a/an/the), prepositions, sentence fragments, informal words that should be more academic.

Return ONLY valid JSON - no markdown, no explanation:
{
  "errors": [
    { "original": "...exact phrase from text...", "corrected": "...", "explanation": "...why this is wrong...", "type": "grammar|punctuation|register|tense" }
  ],
  "correctedText": "...full corrected version...",
  "overallComment": "...one sentence...",
  "score": 7
}

If no errors, return errors as empty array. score is out of 10.`

    const responseText = await callGroq(prompt, 1500)
    const feedback = parseJsonResponse(responseText)

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Error checking grammar:', error)
    return NextResponse.json({error: 'Failed to check grammar'}, {status: 500})
  }
}
