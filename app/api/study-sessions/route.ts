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
    // Build data object dynamically - only include fields that are provided
    // This allows us to work with any database schema
    const createData: any = {
      userId: user.id,
      date: data.date ? new Date(data.date) : new Date(),
      subject: data.subject || 'Unknown',
      topic: data.topic || 'Unknown',
      taskType: data.taskType || 'Revision',
      deepFocusScore: data.deepFocusScore || 5,
      distractionCount: data.distractionCount || 0
    }

    // Add optional core fields if provided
    if (data.startTime) createData.startTime = new Date(data.startTime)
    if (data.endTime) createData.endTime = new Date(data.endTime)
    if (data.totalHours !== undefined && data.totalHours !== null) createData.totalHours = data.totalHours
    if (data.paperCode !== undefined && data.paperCode !== null) createData.paperCode = data.paperCode
    if (data.paperYear !== undefined && data.paperYear !== null) createData.paperYear = data.paperYear
    if (data.questionsAttempted !== undefined && data.questionsAttempted !== null) createData.questionsAttempted = data.questionsAttempted
    if (data.questionsCorrect !== undefined && data.questionsCorrect !== null) createData.questionsCorrect = data.questionsCorrect
    if (data.accuracy !== undefined && data.accuracy !== null) createData.accuracy = data.accuracy
    if (data.mistakeType !== undefined && data.mistakeType !== null) createData.mistakeType = data.mistakeType
    if (data.notes !== undefined && data.notes !== null) createData.notes = data.notes

    // Add new feature fields if provided
    if (data.isTopicalPaper !== undefined) createData.isTopicalPaper = data.isTopicalPaper
    if (data.topicalPaperName !== undefined && data.topicalPaperName !== null) createData.topicalPaperName = data.topicalPaperName
    if (data.topicalSource !== undefined && data.topicalSource !== null) createData.topicalSource = data.topicalSource
    if (data.uploadedPaperUrl !== undefined && data.uploadedPaperUrl !== null) createData.uploadedPaperUrl = data.uploadedPaperUrl
    if (data.notesAuthor !== undefined && data.notesAuthor !== null) createData.notesAuthor = data.notesAuthor
    if (data.notesSource !== undefined && data.notesSource !== null) createData.notesSource = data.notesSource
    if (data.uploadedNotesUrl !== undefined && data.uploadedNotesUrl !== null) createData.uploadedNotesUrl = data.uploadedNotesUrl
    if (data.totalMarks !== undefined && data.totalMarks !== null) createData.totalMarks = data.totalMarks
    if (data.obtainedMarks !== undefined && data.obtainedMarks !== null) createData.obtainedMarks = data.obtainedMarks

    const studySession = (await (prisma.studySession.create as any)({
      data: createData
    })) as any

    // Update or create TopicMastery (optional - table may not exist in DB yet)
    let topicMastery: any = null
    try {
      const prismaAny = prisma as any
      topicMastery = await prismaAny.topicMastery.upsert({
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

      await prismaAny.topicMastery.update({
        where: { id: topicMastery.id },
        data: { needsRevision }
      })
    } catch (err) {
      console.log('TopicMastery table not available yet, skipping')
    }

    return NextResponse.json({ success: true, studySession, topicMastery })
  } catch (error) {
    console.error('Error creating study session:', error)
    const errorMsg = error instanceof Error ? error.message : 'Failed to create session'
    return NextResponse.json({error: errorMsg}, {status: 500})
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
