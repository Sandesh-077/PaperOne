import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exams = await prisma.exam.findMany({
    where: {
      userId: session.user.id,
      completed: false,
    },
    include: {
      subject: true,
    },
    orderBy: {
      examDate: 'asc',
    },
  })

  // Calculate days remaining for each exam
  const examsWithCountdown = exams.map((exam: any) => {
    const now = new Date()
    const examDate = new Date(exam.examDate)
    const daysRemaining = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      ...exam,
      daysRemaining,
    }
  })

  return NextResponse.json(examsWithCountdown)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, examDate, subjectId, board, notes } = await request.json()

  if (!name || !examDate) {
    return NextResponse.json(
      { error: 'Exam name and date are required' },
      { status: 400 }
    )
  }

  // Verify subject belongs to user if provided
  if (subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject || subject.userId !== session.user.id) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }
  }

  const exam = await prisma.exam.create({
    data: {
      userId: session.user.id,
      name,
      examDate: new Date(examDate),
      subjectId,
      board,
      notes,
    },
    include: {
      subject: true,
    },
  })

  return NextResponse.json(exam, { status: 201 })
}
