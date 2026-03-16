import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { callGemini, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = (session.user as any).id
    const url = new URL(req.url)
    const sortBy = url.searchParams.get('sortBy') || 'focusLevel' // 'focusLevel' | 'frequency' | 'recent'

    let orderBy: any = {}
    if (sortBy === 'focusLevel') orderBy.focusLevel = 'desc'
    else if (sortBy === 'frequency') orderBy.instanceCount = 'desc'
    else orderBy.lastOccurrenceAt = 'desc'

    const weaknesses = await prisma.grammarWeaknessArea.findMany({
      where: { userId },
      orderBy,
    })

    return NextResponse.json({ weaknesses })
  } catch (error) {
    console.error('Error fetching grammar weaknesses:', error)
    return NextResponse.json({ error: 'Failed to fetch weaknesses' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { generateExercise = false } = await req.json()

  try {
    // Get user's top 3 weakness areas
    const weaknesses = await prisma.grammarWeaknessArea.findMany({
      where: { userId },
      orderBy: { focusLevel: 'desc' },
      take: 3,
    })

    if (weaknesses.length === 0) {
      return NextResponse.json({
        message: 'No grammar weaknesses identified yet. Continue writing to identify areas for improvement!',
        weaknesses: [],
        exercises: []
      })
    }

    // Generate targeted exercises if requested
    let exercises: any[] = []
    if (generateExercise) {
      exercises = await generateTargetedExercises(userId, weaknesses)
    }

    return NextResponse.json({
      weaknesses,
      exercises,
      recommendation: weaknesses[0]?.grammarArea
        ? `Your top focus area: ${weaknesses[0].grammarArea}. Complete the exercises below to practice.`
        : 'Continue writing to identify specific areas for improvement.'
    })
  } catch (error) {
    console.error('Error analyzing grammar weaknesses:', error)
    return NextResponse.json({ error: 'Failed to analyze weaknesses' }, { status: 500 })
  }
}

async function generateTargetedExercises(userId: string, weaknesses: any[]) {
  const grammarAreas = weaknesses.map(w => w.grammarArea).join(', ')

  const prompt = `You are an English grammar coach for Cambridge A-Level and IELTS students.

Generate 5 targeted grammar exercises focusing on these weak areas: ${grammarAreas}

Create exercises that:
1. Are progressively harder
2. Include real-world context (essays, debates, formal writing)
3. Test the specific grammar rule
4. Have clear expected answers

Return ONLY valid JSON - no markdown:
{
  "exercises": [
    {
      "level": 1,
      "grammarFocus": "Area name",
      "scenario": "Situation or context",
      "question": "What the student must do",
      "taskType": "fill-blank | rewrite | choose | identify",
      "expectedFocus": "What grammar rule being tested",
      "example": "Sample solution"
    }
  ]
}`

  try {
    const exerciseText = await callGemini(prompt, 1500)
    const exerciseData = parseJsonResponse(exerciseText)
    return exerciseData.exercises || []
  } catch (error) {
    console.error('Error generating exercises:', error)
    return []
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Weakness ID is required' }, { status: 400 })
  }

  const { focusLevel, practiceAttempts } = await req.json()

  try {
    const updates: any = {}
    if (focusLevel !== undefined) updates.focusLevel = focusLevel
    if (practiceAttempts !== undefined) updates.practiceAttempts = practiceAttempts

    const weakness = await prisma.grammarWeaknessArea.update({
      where: { id },
      data: updates
    })

    return NextResponse.json({ weakness })
  } catch (error) {
    console.error('Error updating grammar weakness:', error)
    return NextResponse.json({ error: 'Failed to update weakness' }, { status: 500 })
  }
}
