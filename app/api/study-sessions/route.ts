import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const data = await req.json()

  try {
    // Create study session
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        date: new Date(data.date),
        startTime: new Date(`${data.date}T${data.startTime}`),
        endTime: new Date(`${data.date}T${data.endTime}`),
        subject: data.subject,
        topic: data.topic,
        taskType: data.taskType,
        paperCode: data.paperCode,
        paperYear: data.paperYear,
        deepFocusScore: data.deepFocusScore,
        questionsAttempted: data.questionsAttempted,
        questionsCorrect: data.questionsCorrect,
        accuracy: data.accuracy,
        mistakeType: data.mistakeType,
        distractionCount: data.distractionCount,
        notes: data.notes,
        totalHours: data.totalHours
      }
    })

    // Update or create TopicMastery
    const topicMastery = await prisma.topicMastery.upsert({
      where: { userId_subject_topicName: { userId: user.id, subject: data.subject, topicName: data.topic } },
      update: {
        sessionsLogged: { increment: 1 },
        lastRevised: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        subject: data.subject,
        topicName: data.topic,
        confidenceScore: 3,
        sessionsLogged: 1,
        lastRevised: new Date()
      }
    })

    // Recalculate needsRevision
    const lastRevisedDate = new Date(topicMastery.lastRevised || new Date())
    const daysSinceRevision = Math.floor((Date.now() - lastRevisedDate.getTime()) / (1000 * 60 * 60 * 24))
    const needsRevision = topicMastery.confidenceScore <= 3 || daysSinceRevision > 7

    await prisma.topicMastery.update({
      where: { id: topicMastery.id },
      data: { needsRevision }
    })

    return NextResponse.json({ success: true, studySession, topicMastery })
  } catch (error) {
    console.error('Error creating study session:', error)
    return NextResponse.json({error: 'Failed to create session'}, {status: 500})
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const subject = searchParams.get('subject')
  const taskType = searchParams.get('taskType')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    const where: any = { userId: user.id }

    if (date) {
      const d = new Date(date)
      where.date = {
        gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
      }
    }
    if (subject) where.subject = subject
    if (taskType) where.taskType = taskType
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    }

    const sessions = await prisma.studySession.findMany({
      where,
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json({error: 'Failed to fetch sessions'}, {status: 500})
  }
}
