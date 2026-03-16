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
    const url = new URL(req.url)
    const wordId = url.searchParams.get('wordId')

    let query: any = { userId }
    if (wordId) query.wordId = wordId

    const journals = await prisma.learningJournal.findMany({
      where: query,
      include: {
        word: true,
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ journals })
  } catch (error) {
    console.error('Error fetching learning journals:', error)
    return NextResponse.json({ error: 'Failed to fetch journals' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const {
    wordId,
    meaningNoted,
    exampleSentences = [],
    personalNotes,
    grammarRulesApplied = [],
    areasOfConfusion,
    practiceScenarios = []
  } = await req.json()

  if (!wordId || !meaningNoted) {
    return NextResponse.json({ error: 'wordId and meaningNoted are required' }, { status: 400 })
  }

  try {
    // Check if journal entry exists
    const existing = await prisma.learningJournal.findUnique({
      where: {
        userId_wordId: {
          userId,
          wordId
        }
      }
    })

    let journal
    if (existing) {
      // Update existing
      journal = await prisma.learningJournal.update({
        where: { id: existing.id },
        data: {
          meaningNoted,
          exampleSentences,
          personalNotes,
          grammarRulesApplied,
          areasOfConfusion,
          practiceScenarios,
        },
        include: { word: true }
      })
    } else {
      // Create new
      journal = await prisma.learningJournal.create({
        data: {
          userId,
          wordId,
          meaningNoted,
          exampleSentences,
          personalNotes,
          grammarRulesApplied,
          areasOfConfusion,
          practiceScenarios,
        },
        include: { word: true }
      })
    }

    return NextResponse.json({ journal }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating learning journal:', error)
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const url = new URL(req.url)
  const journalId = url.searchParams.get('id')

  if (!journalId) {
    return NextResponse.json({ error: 'Journal ID is required' }, { status: 400 })
  }

  const updates = await req.json()

  try {
    const journal = await prisma.learningJournal.update({
      where: { id: journalId },
      data: updates,
      include: { word: true }
    })

    return NextResponse.json({ journal })
  } catch (error) {
    console.error('Error updating learning journal:', error)
    return NextResponse.json({ error: 'Failed to update journal' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const journalId = url.searchParams.get('id')

  if (!journalId) {
    return NextResponse.json({ error: 'Journal ID is required' }, { status: 400 })
  }

  try {
    await prisma.learningJournal.delete({
      where: { id: journalId }
    })

    return NextResponse.json({ message: 'Journal deleted successfully' })
  } catch (error) {
    console.error('Error deleting learning journal:', error)
    return NextResponse.json({ error: 'Failed to delete journal' }, { status: 500 })
  }
}
