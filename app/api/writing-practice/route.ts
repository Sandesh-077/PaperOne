import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = (session.user as any).id
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // If specific ID requested, fetch that submission
    if (id) {
      const submission = await prisma.writingPractice.findUnique({
        where: { id }
      })

      if (!submission || submission.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      return NextResponse.json({
        submission: {
          ...submission,
          aiFeedback: submission.aiFeedback ? JSON.parse(submission.aiFeedback as any) : null,
        }
      })
    }

    // Otherwise, fetch all submissions
    const submissions = await prisma.writingPractice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      submissions: submissions.map(p => ({
        ...p,
        aiFeedback: p.aiFeedback ? JSON.parse(p.aiFeedback as any) : null,
      }))
    })
  } catch (error) {
    console.error('Error fetching writing practices:', error)
    return NextResponse.json({ error: 'Failed to fetch writing practices' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { title, prompt, studentWriting, difficulty = 'intermediate', focusArea } = await req.json()

  if (!studentWriting || !prompt) {
    return NextResponse.json({ error: 'Writing and prompt are required' }, { status: 400 })
  }

  const wordCount = studentWriting.trim().split(/\s+/).filter((w: string) => w.length > 0).length

  try {
    // Create initial record
    const writing = await prisma.writingPractice.create({
      data: {
        userId,
        title: title || `Writing Practice - ${new Date().toLocaleDateString()}`,
        prompt,
        studentWriting,
        difficulty,
        focusArea,
        wordCount,
      }
    })

    // Now generate AI feedback asynchronously
    generateAIFeedback(userId, writing.id, prompt, studentWriting, focusArea)

    return NextResponse.json({
      id: writing.id,
      message: 'Writing submitted. AI feedback is being generated...',
      wordCount
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating writing practice:', error)
    return NextResponse.json({ error: 'Failed to save writing' }, { status: 500 })
  }
}

async function generateAIFeedback(userId: string, writingId: string, prompt: string, studentWriting: string, focusArea?: string) {
  try {
    const assessmentPrompt = `You are an experienced Cambridge A-Level General Paper (8021) examiner and IELTS/SAT preparation expert.

Analyze this student writing and provide comprehensive feedback:

PROMPT: ${prompt}

STUDENT'S WRITING:
${studentWriting}

${focusArea ? `FOCUS AREA FOR THIS ATTEMPT: ${focusArea}` : ''}

Evaluate on these criteria:

1. **Grammar (0-10 points)**
   - List specific grammar issues found
   - Grade on correctness overall

2. **Vocabulary (0-10 points)**
   - Assess range and accuracy of vocabulary
   - Note any words used incorrectly or awkwardly

3. **Sentence Structure (0-10 points)**
   - Evaluate sentence variety and complexity
   - Check for fragments, run-ons, clarity

4. **Overall (0-10 points)**
   - General coherence and effectiveness

Return ONLY valid JSON - no markdown, no explanation:
{
  "grammarScore": 7,
  "vocabularyScore": 8,
  "sentenceStructureScore": 6,
  "overallScore": 7,
  "grammarErrors": [
    {
      "error": "subject-verb agreement",
      "example": "The team are playing",
      "correction": "The team is playing",
      "explanation": "Singular noun requires singular verb"
    }
  ],
  "vocabularyAnalysis": [
    {
      "issue": "word used incorrectly",
      "word": "affect",
      "context": "This will effect...",
      "feedback": "Should be 'affect' (verb)"
    },
    {
      "issue": "repetitive word",
      "word": "good",
      "suggestion": "excellent, outstanding, impressive"
    }
  ],
  "strengths": [
    "Clear thesis statement",
    "Good use of evidence"
  ],
  "improvements": [
    "Vary sentence structure more",
    "Use more sophisticated transitions"
  ],
  "suggestions": [
    "Try using 'Furthermore' instead of 'Also'",
    "This paragraph needs a topic sentence"
  ]
}`;

    const feedbackText = await callGroq(assessmentPrompt, 2000)
    const feedback = parseJsonResponse(feedbackText)

    // Extract word usage information
    const usedCorrectly: string[] = []
    const usedIncorrectly: string[] = []

    if (feedback.vocabularyAnalysis) {
      feedback.vocabularyAnalysis.forEach((analysis: any) => {
        if (analysis.issue === 'word used incorrectly') {
          usedIncorrectly.push(analysis.word)
        } else {
          usedCorrectly.push(analysis.word)
        }
      })
    }

    // Extract grammar areas
    const grammarAreas = new Set<string>()
    if (feedback.grammarErrors) {
      feedback.grammarErrors.forEach((error: any) => {
        grammarAreas.add(error.error)
      })
    }

    // Update the writing practice record with feedback
    await prisma.writingPractice.update({
      where: { id: writingId },
      data: {
        grammarScore: feedback.grammarScore,
        vocabularyScore: feedback.vocabularyScore,
        sentenceStructureScore: feedback.sentenceStructureScore,
        overallScore: feedback.overallScore,
        aiFeedback: feedback,
        feedbackGeneratedAt: new Date(),
        wordsUsedCorrectly: usedCorrectly,
        wordsUsedIncorrectly: usedIncorrectly,
        grammarAreasFound: Array.from(grammarAreas),
      }
    })

    // Track grammar weaknesses
    for (const area of grammarAreas) {
      const existing = await prisma.grammarWeaknessArea.findUnique({
        where: {
          userId_grammarArea: {
            userId,
            grammarArea: area
          }
        }
      })

      if (existing) {
        await prisma.grammarWeaknessArea.update({
          where: { id: existing.id },
          data: {
            instanceCount: existing.instanceCount + 1,
            lastOccurrenceAt: new Date(),
          }
        })
      } else {
        await prisma.grammarWeaknessArea.create({
          data: {
            userId,
            grammarArea: area,
            description: `Issue with ${area}`,
            instanceCount: 1,
          }
        })
      }
    }

  } catch (error) {
    console.error('Error generating AI feedback:', error)
  }
}
