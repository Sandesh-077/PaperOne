import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = (session.user as any).id

    // Get user's vocabulary progress for all words they've interacted with
    const vocabularyProgress = await prisma.vocabularyProgress.findMany({
      where: { userId },
      include: {
        word: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format the response
    const vocabulary = vocabularyProgress.map(prog => ({
      id: prog.word.id,
      word: prog.word.word,
      definition: prog.word.definition,
      sentences: [prog.word.exampleSentence],
      learned: prog.status === 'learned',
      category: prog.word.category,
      createdAt: prog.firstSeenAt.toISOString(),
      status: prog.status,
      confidenceLevel: prog.confidenceLevel
    }))

    return NextResponse.json(vocabulary)
  } catch (error) {
    console.error('Error fetching vocabulary:', error)
    return NextResponse.json({ error: 'Failed to fetch vocabulary' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { word, definition, sentences, category } = await req.json()

    if (!word || !definition) {
      return NextResponse.json({ error: 'Word and definition are required' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Create or find the DailyWord
    const dailyWord = await prisma.dailyWord.upsert({
      where: { word },
      update: {},
      create: {
        word,
        definition,
        exampleSentence: sentences?.[0] || definition,
        category: category || 'General',
        difficulty: 3
      }
    })

    // Create or update user's vocabulary progress
    const progress = await prisma.vocabularyProgress.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId: dailyWord.id
        }
      },
      update: {},
      create: {
        userId,
        wordId: dailyWord.id,
        status: 'learning',
        confidenceLevel: 1
      }
    })

    return NextResponse.json({
      id: dailyWord.id,
      word: dailyWord.word,
      definition: dailyWord.definition,
      sentences: [dailyWord.exampleSentence],
      learned: false,
      category: dailyWord.category,
      createdAt: progress.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error creating vocabulary:', error)
    return NextResponse.json({ error: 'Failed to create vocabulary' }, { status: 500 })
  }
}
