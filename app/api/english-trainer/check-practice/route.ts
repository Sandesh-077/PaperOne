import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json()
  const { response, questionAsked, grammarRule, vocabWords, trainerSessionId } = body

  if (!response || !questionAsked || !grammarRule) {
    return NextResponse.json(
      { error: 'Missing required fields: response, questionAsked, grammarRule' },
      { status: 400 }
    )
  }

  try {
    // Fetch EnglishProfile
    const profile = await (prisma as any).englishProfile.findUnique({
      where: { userId: user.id }
    })

    if (!profile) {
      return NextResponse.json({ error: 'English profile not found' }, { status: 404 })
    }

    // Build prompt for evaluation
    const vocabWordsStr = Array.isArray(vocabWords) ? vocabWords.join(', ') : ''

    const prompt = `You are a Cambridge A-Level English General Paper examiner and language teacher. Evaluate this student's written response strictly but constructively.

Grammar rule they were supposed to use: ${grammarRule}
Vocabulary words they were taught: ${vocabWordsStr}
Question asked: ${questionAsked}
Student's response: ${response}

Current student levels — Grammar: ${profile.grammarLevel}/10, Vocab: ${profile.vocabLevel}/10

Evaluate and return ONLY valid JSON:
{
  "grammarAnalysis": {
    "usedTargetRule": true,
    "grammarErrors": [{ "original": "...", "corrected": "...", "explanation": "..." }],
    "grammarScore": 8,
    "grammarComment": "...one encouraging but honest sentence..."
  },
  "vocabAnalysis": {
    "targetWordsUsed": ["...words from taught list they actually used..."],
    "vocabScore": 7,
    "betterAlternatives": [{ "used": "...simpler word they used...", "suggested": "...better academic word..." }],
    "vocabComment": "...one sentence..."
  },
  "argumentAnalysis": {
    "hasPoint": true,
    "hasEvidence": true,
    "hasEvaluation": true,
    "argumentScore": 8,
    "argumentComment": "...one sentence on argument quality..."
  },
  "correctedVersion": "...the full response rewritten correctly with improvements shown...",
  "overallFeedback": "...2-3 sentences of holistic feedback...",
  "levelChanges": {
    "grammarDelta": 0,
    "vocabDelta": 1,
    "encouragement": "...one motivating sentence..."
  }
}`

    // Call Gemini
    const aiResponse = await callGroq(prompt, 1500)
    const feedback = parseJsonResponse(aiResponse)

    // Update EnglishProfile with level changes (clamped 1-10)
    const newGrammarLevel = Math.max(1, Math.min(10, profile.grammarLevel + (feedback.levelChanges?.grammarDelta || 0)))
    const newVocabLevel = Math.max(1, Math.min(10, profile.vocabLevel + (feedback.levelChanges?.vocabDelta || 0)))
    const newOverallScore = ((newGrammarLevel + newVocabLevel + profile.writingLevel * 2) / 4) * 10

    const updatedProfile = await (prisma as any).englishProfile.update({
      where: { userId: user.id },
      data: {
        grammarLevel: newGrammarLevel,
        vocabLevel: newVocabLevel,
        overallScore: newOverallScore
      }
    })

    // Update TrainerSession if ID provided
    if (trainerSessionId) {
      await (prisma as any).trainerSession.update({
        where: { id: trainerSessionId },
        data: {
          questionAsked,
          userResponse: response,
          aiFeedback: feedback,
          grammarScoreDelta: feedback.levelChanges?.grammarDelta || 0,
          vocabScoreDelta: feedback.levelChanges?.vocabDelta || 0
        }
      })
    }

    return NextResponse.json({
      feedback,
      updatedProfile: {
        grammarLevel: updatedProfile.grammarLevel,
        vocabLevel: updatedProfile.vocabLevel,
        overallScore: updatedProfile.overallScore
      }
    })
  } catch (error: any) {
    console.error('Check practice error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate practice response' },
      { status: 500 }
    )
  }
}
