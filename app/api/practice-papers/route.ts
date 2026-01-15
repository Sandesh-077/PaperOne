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
  const subjectId = searchParams.get('subjectId')
  const topicId = searchParams.get('topicId')

  const where: any = {
    subject: {
      userId: session.user.id,
    },
  }

  if (subjectId) {
    where.subjectId = subjectId
  }

  if (topicId) {
    where.topicId = topicId
  }

  const practicePapers = await prisma.practicePaper.findMany({
    where,
    include: {
      subject: true,
      topic: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(practicePapers)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    subjectId,
    topicId,
    paperName,
    questionStart,
    questionEnd,
    completed,
    score,
    totalMarks,
    notes,
    reminderDays,
  } = await request.json()

  if (!subjectId || !paperName || !questionStart || !questionEnd) {
    return NextResponse.json(
      { error: 'Subject, paper name, and question range are required' },
      { status: 400 }
    )
  }

  // Verify subject belongs to user
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  })

  if (!subject || subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Calculate reminder date if reminderDays provided
  let reminderDate = null
  if (reminderDays && reminderDays > 0) {
    reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + reminderDays)
  }

  const practicePaper = await prisma.practicePaper.create({
    data: {
      subjectId,
      topicId,
      paperName,
      questionStart,
      questionEnd,
      completed: completed ?? false,
      score,
      totalMarks,
      notes,
      reminderDate,
      reminderDays,
    },
    include: {
      subject: true,
      topic: true,
    },
  })

  return NextResponse.json(practicePaper, { status: 201 })
}
