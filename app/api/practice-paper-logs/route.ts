import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const practicePaperId = searchParams.get('practicePaperId')

  if (!practicePaperId) {
    return NextResponse.json({ error: 'Practice paper ID is required' }, { status: 400 })
  }

  // Verify paper belongs to user
  const paper = await prisma.practicePaper.findUnique({
    where: { id: practicePaperId },
    include: { subject: true },
  })

  if (!paper || paper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const logs = await prisma.practicePaperLog.findMany({
    where: { practicePaperId },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(logs)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    practicePaperId,
    questionStart,
    questionEnd,
    completed,
    score,
    totalMarks,
    duration,
    notes,
  } = await request.json()

  if (!practicePaperId || !questionStart || !questionEnd) {
    return NextResponse.json(
      { error: 'Practice paper ID, question start, and question end are required' },
      { status: 400 }
    )
  }

  // Verify paper belongs to user
  const paper = await prisma.practicePaper.findUnique({
    where: { id: practicePaperId },
    include: { 
      subject: true, 
      logs: {
        orderBy: { date: 'desc' },
        take: 1
      }
    },
  })

  if (!paper || paper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check if paper is already completed and not being reworked
  if (paper.completed && !completed) {
    return NextResponse.json(
      { error: 'Paper already completed. Use rework option to add more logs.' },
      { status: 400 }
    )
  }

  // Auto-detect completion if totalQuestions is set
  let isComplete = completed ?? false
  if (paper.totalQuestions && questionEnd) {
    // Extract numeric part from questionEnd
    const endNum = parseInt(questionEnd.replace(/[^\d]/g, ''))
    if (endNum >= paper.totalQuestions) {
      isComplete = true
    }
  }

  // Create the log
  const log = await prisma.practicePaperLog.create({
    data: {
      practicePaperId,
      questionStart,
      questionEnd,
      completed: isComplete,
      score,
      totalMarks,
      duration,
      notes,
    },
  })

  // Update paper if this session completed it
  if (isComplete) {
    await prisma.practicePaper.update({
      where: { id: practicePaperId },
      data: {
        completed: true,
        score,
        totalMarks,
      },
    })
  }

  return NextResponse.json(log, { status: 201 })
}
