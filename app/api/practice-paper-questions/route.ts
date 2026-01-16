import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Get all tracked questions for a paper
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

  const questions = await prisma.practicePaperQuestion.findMany({
    where: { practicePaperId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(questions)
}

// Add a question to track (redo/focus/later)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { practicePaperId, questionNumber, status, notes } = await request.json()

  if (!practicePaperId || !questionNumber || !status) {
    return NextResponse.json(
      { error: 'Practice paper ID, question number, and status are required' },
      { status: 400 }
    )
  }

  // Verify paper belongs to user
  const paper = await prisma.practicePaper.findUnique({
    where: { id: practicePaperId },
    include: { subject: true },
  })

  if (!paper || paper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check if question already exists
  const existingQuestion = await prisma.practicePaperQuestion.findFirst({
    where: {
      practicePaperId,
      questionNumber,
    },
  })

  let question
  if (existingQuestion) {
    // Update existing
    question = await prisma.practicePaperQuestion.update({
      where: { id: existingQuestion.id },
      data: { status, notes },
    })
  } else {
    // Create new
    question = await prisma.practicePaperQuestion.create({
      data: {
        practicePaperId,
        questionNumber,
        status,
        notes,
      },
    })
  }

  return NextResponse.json(question, { status: 201 })
}
