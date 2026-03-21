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

  try {
    const requestBody = await req.json().catch(() => ({}))
    const lockedGrammarRule = typeof requestBody?.lockedGrammarRule === 'string'
      ? requestBody.lockedGrammarRule.trim()
      : ''
    const previousVocabWords = Array.isArray(requestBody?.previousVocabWords)
      ? requestBody.previousVocabWords.filter((word: unknown) => typeof word === 'string')
      : []
    const todayTopicOverride = typeof requestBody?.todayTopic === 'string'
      ? requestBody.todayTopic.trim()
      : ''
    const retryMode = Boolean(requestBody?.retryMode)

    // Test log: confirm route is reached
    console.log('daily-lesson called for user:', user.id)
    console.log('session.user.id:', session.user.id)
    
    // Check GROQ_API_KEY before proceeding
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set in environment variables')
    }

    // Fetch or create EnglishProfile
    console.log('Attempting to upsert EnglishProfile for userId:', user.id)
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
    console.log('EnglishProfile upserted successfully:', profile.id)

    // Fetch last 10 LearnedItems to avoid repetition
    console.log('Fetching recently learned items...')
    const recentlyLearned = await (prisma as any).learnedItem.findMany({
      where: { userId: user.id },
      orderBy: { learnedAt: 'desc' },
      take: 10,
      select: { content: true, itemType: true }
    })
    console.log('Found', recentlyLearned.length, 'recently learned items')

    const recentContent = recentlyLearned
      .map((item: any) => `${item.itemType}: ${item.content}`)
      .join(', ')

    const retryInstructions = lockedGrammarRule
      ? `
CRITICAL RETRY RULES:
- Keep the grammar rule EXACTLY the same as: ${lockedGrammarRule}. Do not advance to a different grammar rule.
- Keep the topic consistent with: ${todayTopicOverride || 'the current topic'}.
- Use exactly 3 vocab words total.
- Keep at least one word from this previous list: ${previousVocabWords.join(', ') || 'none'}.
- Replace only one or two vocab words with new words.
`
      : ''

    // Build prompt for Gemini
    const prompt = `You are a Cambridge A-Level English General Paper teacher. This student is at grammar level ${profile.grammarLevel}/10 and vocabulary level ${profile.vocabLevel}/10. They are preparing for Cambridge GP 8021, SAT Writing (750+ target), and IELTS 7.0+.

Recently learned items to AVOID repeating: ${recentContent || 'none yet'}

${retryInstructions}

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

    // Call Groq
    console.log('Calling Groq API...')
    const response = await callGroq(prompt, 1500)
    console.log('Groq response received, length:', response.length)

    // Parse JSON response with dedicated error handling
    let lesson
    try {
      console.log('Parsing JSON response from Groq...')
      lesson = parseJsonResponse(response)
      console.log('JSON parsed successfully')
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError.message)
      console.error('Raw response:', response.substring(0, 500))
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`)
    }

    // Validate lesson structure
    if (!lesson.grammarRule || !lesson.vocabWords || !lesson.todayTopic) {
      throw new Error('Invalid lesson structure from Gemini - missing required fields')
    }

    if (lockedGrammarRule) {
      lesson.grammarRule.name = lockedGrammarRule
      if (todayTopicOverride) {
        lesson.todayTopic = todayTopicOverride
      }
    }

    // Save the grammar rule as a LearnedItem
    console.log('Saving grammar rule as LearnedItem:', lesson.grammarRule.name)
    try {
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
      console.log('Grammar rule saved successfully')
    } catch (grammarError: any) {
      console.error('Error saving grammar rule:', grammarError.message, grammarError.stack)
      throw grammarError
    }

    // Save the 3 vocab words as LearnedItems
    console.log('Saving', lesson.vocabWords.length, 'vocab words as LearnedItems')
    for (const word of lesson.vocabWords) {
      try {
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
        console.log('Vocab word saved:', word.word)
      } catch (vocabError: any) {
        console.error('Error saving vocab word', word.word, ':', vocabError.message, vocabError.stack)
        throw vocabError
      }
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

    let updatedProfile = profile
    if (!retryMode) {
      console.log('Updating EnglishProfile - new streak:', newStreak, 'new totalSessions:', profile.totalSessions + 1)
      updatedProfile = await (prisma as any).englishProfile.update({
        where: { userId: user.id },
        data: {
          totalSessions: profile.totalSessions + 1,
          lastActiveDate: new Date(),
          streak: newStreak
        }
      })
      console.log('EnglishProfile updated successfully')
    }

    // Save TrainerSession
    console.log('Creating TrainerSession record...')
    try {
      const trainerSession = await (prisma as any).trainerSession.create({
        data: {
          userId: user.id,
          sessionType: retryMode ? 'practice' : 'learn',
          topic: lesson.todayTopic,
          grammarRule: lesson.grammarRule.name,
          vocabWords: lesson.vocabWords
        }
      })
      console.log('TrainerSession created successfully')

      console.log('Daily lesson completed successfully for user:', user.id)
      return NextResponse.json({
        lesson,
        profile: {
          grammarLevel: updatedProfile.grammarLevel,
          vocabLevel: updatedProfile.vocabLevel,
          writingLevel: updatedProfile.writingLevel,
          overallScore: updatedProfile.overallScore,
          streak: updatedProfile.streak
        },
        trainerSessionId: trainerSession.id
      })
    } catch (sessionError: any) {
      console.error('Error creating TrainerSession:', sessionError.message, sessionError.stack)
      throw sessionError
    }
  } catch (error: any) {
    console.error('Daily lesson error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to generate daily lesson', details: error.stack },
      { status: 500 }
    )
  }
}
