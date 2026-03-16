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
    const status = url.searchParams.get('status') // 'learning' | 'learned' | 'needs_practice'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query: any = { userId }
    if (status) query.status = status

    const progress = await prisma.vocabularyProgress.findMany({
      where: query,
      include: { word: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.vocabularyProgress.count({ where: query })

    return NextResponse.json({ progress, total })
  } catch (error) {
    console.error('Error fetching vocabulary progress:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { wordId, status = 'learning', confidenceLevel = 0 } = await req.json()

  if (!wordId) {
    return NextResponse.json({ error: 'wordId is required' }, { status: 400 })
  }

  try {
    const existing = await prisma.vocabularyProgress.findUnique({
      where: {
        userId_wordId: { userId, wordId }
      }
    })

    let progress
    if (existing) {
      progress = await prisma.vocabularyProgress.update({
        where: { id: existing.id },
        data: {
          status,
          confidenceLevel,
          learnedAt: status === 'learned' ? new Date() : undefined,
        },
        include: { word: true }
      })
    } else {
      progress = await prisma.vocabularyProgress.create({
        data: {
          userId,
          wordId,
          status,
          confidenceLevel,
          learnedAt: status === 'learned' ? new Date() : undefined,
        },
        include: { word: true }
      })
    }

    return NextResponse.json({ progress }, { status: 201 })
  } catch (error) {
    console.error('Error creating vocabulary progress:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const progressId = url.searchParams.get('id')

  if (!progressId) {
    return NextResponse.json({ error: 'Progress ID is required' }, { status: 400 })
  }

  const updates = await req.json()

  try {
    const progress = await prisma.vocabularyProgress.update({
      where: { id: progressId },
      data: {
        ...updates,
        learnedAt: updates.status === 'learned' ? new Date() : undefined,
        lastPracticedAt: updates.lastPracticedAt || new Date(),
      },
      include: { word: true }
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error updating vocabulary progress:', error)
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
  }
}
