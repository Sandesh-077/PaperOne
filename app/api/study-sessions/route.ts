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
    // STRICT BASE DATA - Only fields that are GUARANTEED to exist
    // This is the absolute minimum that works with older database schemas
    const minimalData = {
      userId: user.id,
      date: new Date(data.date),
      subject: data.subject,
      topic: data.topic,
      taskType: data.taskType,
      paperCode: data.paperCode || null,
      paperYear: data.paperYear || null,
      deepFocusScore: data.deepFocusScore,
      questionsAttempted: data.questionsAttempted || null,
      questionsCorrect: data.questionsCorrect || null,
      accuracy: data.accuracy || null,
      mistakeType: data.mistakeType || null,
      distractionCount: data.distractionCount || 0,
      notes: data.notes || null
    }

    // Core data with newer columns
    const coreData = {
      ...minimalData,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      totalHours: data.totalHours || 0
    }

    // Extended data for new schema (with migration applied)
    const extendedData = {
      ...coreData,
      isTopicalPaper: data.isTopicalPaper || false,
      topicalPaperName: data.topicalPaperName || null,
      topicalSource: data.topicalSource || null,
      uploadedPaperUrl: data.uploadedPaperUrl || null,
      notesAuthor: data.notesAuthor || null,
      notesSource: data.notesSource || null,
      uploadedNotesUrl: data.uploadedNotesUrl || null,
      totalMarks: data.totalMarks || null,
      obtainedMarks: data.obtainedMarks || null
    }

    let studySession: any
    
    // Try extended schema first (all new features)
    try {
      studySession = (await (prisma.studySession.create as any)({
        data: extendedData
      })) as any
      console.log('✓ Created with extended schema (new features available)')
    } catch (err1: any) {
      // Try core schema (with totalHours, startTime, endTime)
      try {
        studySession = (await (prisma.studySession.create as any)({
          data: coreData
        })) as any
        console.log('✓ Created with core schema (basic features only)')
      } catch (err2: any) {
        // Fall back to minimal schema (oldest database)
        console.log('✓ Created with minimal schema')
        studySession = (await (prisma.studySession.create as any)({
          data: minimalData
        })) as any
      }
    }

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
