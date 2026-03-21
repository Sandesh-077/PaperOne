import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Get optional query params
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const allTasksParam = searchParams.get('allTasks')

    const prismaAny = prisma as any
    
    // If allTasks is requested, return all tasks for the user
    if (allTasksParam === 'true') {
      const tasks = await prismaAny.dailyTask.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' }
      })
      return NextResponse.json({ tasks })
    }

    // Otherwise, return tasks for a specific date (default: today)
    let targetDate = new Date()
    if (dateParam) {
      targetDate = new Date(`${dateParam}T00:00:00Z`)
    } else {
      targetDate.setUTCHours(0, 0, 0, 0)
    }

    // Create date range: 00:00:00 to 23:59:59 UTC
    const dateStart = new Date(targetDate)
    dateStart.setUTCHours(0, 0, 0, 0)
    const dateEnd = new Date(targetDate)
    dateEnd.setUTCHours(23, 59, 59, 999)

    const tasks = await prismaAny.dailyTask.findMany({
      where: {
        userId: user.id,
        date: {
          gte: dateStart,
          lte: dateEnd
        }
      },
      orderBy: {
        sessionSlot: 'asc'
      }
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching daily tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily tasks' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await req.json()
    const {
      date,
      subject,
      subjectName,
      topicName,
      activity,
      taskDesc,
      taskType,
      phase,
      sessionSlot,
      topics,
      completedTopics,
      dayNumber,
    } = body || {}

    if (!date || !subject || !subjectName || !taskDesc) {
      return NextResponse.json(
        { error: 'Missing required fields: date, subject, subjectName, taskDesc' },
        { status: 400 }
      )
    }

    const prismaAny = prisma as any

    let activePlan = await prismaAny.revisionPlan.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { generatedAt: 'desc' },
    })

    if (!activePlan) {
      const planDate = new Date(`${date}T00:00:00Z`)
      activePlan = await prismaAny.revisionPlan.create({
        data: {
          userId: user.id,
          firstExamDate: planDate,
          lastExamDate: planDate,
          studyHoursPerDay: 4,
          isActive: true,
          planData: {
            source: 'manual-planner',
            createdBy: 'daily-tasks-post',
          },
        },
      })
    }

    const taskDate = new Date(`${date}T00:00:00Z`)
    if (Number.isNaN(taskDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const createdTask = await prismaAny.dailyTask.create({
      data: {
        userId: user.id,
        planId: activePlan.id,
        date: taskDate,
        sessionSlot: typeof sessionSlot === 'string' ? sessionSlot : 'subject-wise',
        subject,
        subjectName,
        topicName: typeof topicName === 'string' ? topicName : null,
        topics: Array.isArray(topics) ? topics : null,
        completedTopics: Array.isArray(completedTopics) ? completedTopics : null,
        activity: typeof activity === 'string' ? activity : null,
        dayNumber: typeof dayNumber === 'number' ? dayNumber : null,
        taskDesc,
        taskType: typeof taskType === 'string' ? taskType : 'Revision',
        phase: typeof phase === 'string' ? phase : 'Manual',
      },
    })

    return NextResponse.json({ task: createdTask }, { status: 201 })
  } catch (error) {
    console.error('Error creating daily task:', error)
    return NextResponse.json(
      { error: 'Failed to create daily task' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const prismaAny = prisma as any
    const body = await req.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id : null
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
    const deleteAll = body?.all === true

    if (deleteAll) {
      const result = await prismaAny.dailyTask.deleteMany({ where: { userId: user.id } })
      return NextResponse.json({ success: true, deletedCount: result.count })
    }

    if (ids.length > 0) {
      const result = await prismaAny.dailyTask.deleteMany({
        where: {
          userId: user.id,
          id: { in: ids }
        }
      })
      return NextResponse.json({ success: true, deletedCount: result.count })
    }

    if (id) {
      // Idempotent delete: return success even if record is already gone.
      const result = await prismaAny.dailyTask.deleteMany({ where: { userId: user.id, id } })
      return NextResponse.json({ success: true, deletedCount: result.count })
    }

    return NextResponse.json({ error: 'Provide one of: { id }, { ids }, or { all: true }' }, { status: 400 })
  } catch (error) {
    console.error('Error deleting daily tasks:', error)
    return NextResponse.json(
      { error: 'Failed to delete daily tasks' },
      { status: 500 }
    )
  }
}
