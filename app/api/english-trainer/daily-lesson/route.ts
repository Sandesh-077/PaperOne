import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGemini, parseJsonResponse } from '@/lib/ai-providers'

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

  try {
    // Fetch or create EnglishProfile
    const profile = await (prisma as any).englishProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        grammarLevel: 1,
        vocabLevel: 1,
        writingLevel: 1,
        overallScore: 0,
        gpReadiness: 0,
        satReadiness: 0,
        ieltsEstimate: 0,
        uniReadiness: 0,
        totalSessions: 0,
        streak: 0
      }
    })

    // Fetch last 10 LearnedItems to avoid repetition
    const recentlyLearned = await (prisma as any).learnedItem.findMany({
      where: { userId: user.id },
      orderBy: { learnedAt: 'desc' },
      take: 10,
      select: { content: true, itemType: true }
    })

    const recentContent = recentlyLearned
      .map((item: any) => `${item.itemType}: ${item.content}`)
      .join(', ')

    // Build prompt for Gemini
    const prompt = `You are a Cambridge A-Level English General Paper teacher. This student is at grammar level ${profile.grammarLevel}/10 and vocabulary level ${profile.vocabLevel}/10. They are preparing for Cambridge GP 8021, SAT Writing (750+ target), and IELTS 7.0+.

Recently learned items to AVOID repeating: ${recentContent || 'none yet'}

Generate today's lesson. Return ONLY valid JSON:
{
  "grammarRule": {
    "name": "...short name e.g. Subordinate Clauses...",
    "explanation": "...clear 2-sentence explanation at their level...",
    "example1": "...example sentence using this rule in an academic GP context...",
    "example2": "...another example sentence...",
    "commonMistake": "...the most common mistake students make with this rule...",
    "tip": "...one actionable tip to remember this rule..."
  },
  "vocabWords": [
    {
      "word": "...",
      "partOfSpeech": "noun/verb/adjective/adverb",
      "definition": "...concise definition...",
      "academicExample": "...example in a GP essay argument...",
      "synonyms": ["...", "..."],
      "gpTip": "...when to use this in a GP essay specifically...",
      "difficulty": 5
    }
  ],
  "todayTopic": "...the GP theme this lesson focuses on (e.g. Technology and Society)...",
  "practicePrompt": "...a question about a current world scenario for them to write 3-5 sentences about. Must require using today's grammar rule and at least one new vocab word. Should relate to todayTopic and be at appropriate difficulty level..."
}
Return exactly 3 vocab words with difficulty matching ${profile.vocabLevel}.`

    // Call Gemini
    const response = await callGemini(prompt, 1500)
    const lesson = parseJsonResponse(response)

    // Save the grammar rule as a LearnedItem
    await (prisma as any).learnedItem.upsert({
      where: { userId_itemType_content: { userId: user.id, itemType: 'grammar', content: lesson.grammarRule.name } },
      update: { reviewCount: { increment: 1 }, lastReviewedAt: new Date() },
      create: {
        userId: user.id,
        itemType: 'grammar',
        content: lesson.grammarRule.name,
        learnedAt: new Date(),
        reviewCount: 1
      }
    })

    // Save the 3 vocab words as LearnedItems
    for (const word of lesson.vocabWords) {
      await (prisma as any).learnedItem.upsert({
        where: { userId_itemType_content: { userId: user.id, itemType: 'vocab', content: word.word } },
        update: { reviewCount: { increment: 1 }, lastReviewedAt: new Date() },
        create: {
          userId: user.id,
          itemType: 'vocab',
          content: word.word,
          learnedAt: new Date(),
          reviewCount: 1
        }
      })
    }

    // Update EnglishProfile: increment totalSessions, update lastActiveDate, update streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let newStreak = profile.streak
    if (profile.lastActiveDate) {
      const lastActive = new Date(profile.lastActiveDate)
      lastActive.setHours(0, 0, 0, 0)
      const diffTime = today.getTime() - lastActive.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        newStreak = profile.streak + 1
      } else if (diffDays === 0) {
        newStreak = profile.streak
      } else {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    const updatedProfile = await (prisma as any).englishProfile.update({
      where: { userId: user.id },
      data: {
        totalSessions: profile.totalSessions + 1,
        lastActiveDate: new Date(),
        streak: newStreak
      }
    })

    // Save TrainerSession
    await (prisma as any).trainerSession.create({
      data: {
        userId: user.id,
        sessionType: 'learn',
        topic: lesson.todayTopic,
        grammarRule: lesson.grammarRule.name,
        vocabWords: lesson.vocabWords
      }
    })

    return NextResponse.json({
      lesson,
      profile: {
        grammarLevel: updatedProfile.grammarLevel,
        vocabLevel: updatedProfile.vocabLevel,
        writingLevel: updatedProfile.writingLevel,
        overallScore: updatedProfile.overallScore,
        streak: updatedProfile.streak
      }
    })
  } catch (error: any) {
    console.error('Daily lesson error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate daily lesson' },
      { status: 500 }
    )
  }
}
