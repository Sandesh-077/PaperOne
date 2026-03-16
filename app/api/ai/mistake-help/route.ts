import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const { subject, topic, whatWentWrong } = await req.json()

  if (!subject || !topic || !whatWentWrong) {
    return NextResponse.json({error: 'Missing required fields'}, {status: 400})
  }

  try {
    const prompt = `You are a Cambridge A-Level tutor for ${subject}. A student made a mistake on the topic: ${topic}.
What went wrong: ${whatWentWrong}
Write a clear, concise explanation of the correct method (3-5 sentences). Be specific to the Cambridge A-Level syllabus. No markdown, no bullet points — just plain flowing text the student can save as a revision note.`

    const suggestion = await callGroq(prompt, 500)

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error('Error calling Groq:', error)
    const errorMsg = error instanceof Error ? error.message : 'Failed to generate suggestion'
    return NextResponse.json({error: errorMsg}, {status: 500})
  }
}
