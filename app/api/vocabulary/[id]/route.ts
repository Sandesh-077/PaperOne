import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const { learned } = await req.json()
    const userId = (session.user as any).id

    // Find the DailyWord by ID
    const dailyWord = await prisma.dailyWord.findUnique({
      where: { id }
    })

    if (!dailyWord) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 })
    }

    // Update the user's vocabulary progress
    const progress = await prisma.vocabularyProgress.update({
      where: {
        userId_wordId: {
          userId,
          wordId: id
        }
      },
      data: {
        status: learned ? 'learned' : 'learning',
        learnedAt: learned ? new Date() : null
      }
    })

    return NextResponse.json({
      id: dailyWord.id,
      word: dailyWord.word,
      definition: dailyWord.definition,
      sentences: [dailyWord.exampleSentence],
      learned: progress.status === 'learned',
      category: dailyWord.category,
      createdAt: progress.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating vocabulary:', error)
    return NextResponse.json({ error: 'Failed to update vocabulary' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const userId = (session.user as any).id

    // Delete the user's vocabulary progress for this word
    await prisma.vocabularyProgress.delete({
      where: {
        userId_wordId: {
          userId,
          wordId: id
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vocabulary:', error)
    return NextResponse.json({ error: 'Failed to delete vocabulary' }, { status: 500 })
  }
}
