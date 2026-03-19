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

    const prismaAny = prisma as any

    // STEP 2: Find active revision plan
    const plan = await prismaAny.revisionPlan.findFirst({
      where: {
        userId: user.id,
        isActive: true
      },
      orderBy: {
        generatedAt: 'desc'
      }
    })

    const allExamEntries = await prismaAny.examEntry.findMany({
      where: { userId: user.id },
      orderBy: { examDate: 'asc' }
    })

    const now = new Date()
    const todayStartForMode = new Date(now)
    todayStartForMode.setHours(0, 0, 0, 0)

    const firstExamDate = allExamEntries.length > 0 ? new Date(allExamEntries[0].examDate) : null
    const lastExamDateAll = allExamEntries.length > 0 ? new Date(allExamEntries[allExamEntries.length - 1].examDate) : null

    let examModeReady = false
    let daysUntilFirstExam: number | null = null

    if (firstExamDate && lastExamDateAll) {
      const firstExamStart = new Date(firstExamDate)
      firstExamStart.setHours(0, 0, 0, 0)
      const firstExamWindowStart = new Date(firstExamStart)
      firstExamWindowStart.setDate(firstExamWindowStart.getDate() - 2)

      const lastExamEnd = new Date(lastExamDateAll)
      lastExamEnd.setHours(23, 59, 59, 999)

      daysUntilFirstExam = Math.ceil((firstExamStart.getTime() - todayStartForMode.getTime()) / 86400000)
      examModeReady = todayStartForMode >= firstExamWindowStart && todayStartForMode <= lastExamEnd
    }

    // Return empty response if no active plan
    if (!plan) {
      return NextResponse.json({
        plan: null,
        todayTasks: [],
        weekTasks: [],
        stats: null,
        nextExams: [],
        examMode: {
          ready: examModeReady,
          active: false,
          daysUntilFirstExam
        }
      })
    }

    // STEP 3: Get today's tasks
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const todayTasks = await prismaAny.dailyTask.findMany({
      where: {
        planId: plan.id,
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      orderBy: [
        { sessionSlot: 'asc' }
      ]
    })

    // STEP 4: Get this week's tasks
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
    const daysBackToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - daysBackToMonday)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const weekTasks = await prismaAny.dailyTask.findMany({
      where: {
        planId: plan.id,
        date: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      orderBy: [
        { date: 'asc' },
        { sessionSlot: 'asc' }
      ]
    })

    // STEP 5: Calculate stats
    const allPlanTasks = await prismaAny.dailyTask.findMany({
      where: {
        planId: plan.id
      },
      select: {
        id: true,
        completed: true
      }
    })

    const totalTasks = allPlanTasks.length
    const completedTasks = allPlanTasks.filter((t: any) => t.completed).length
    const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // STEP 6: Get next exam countdowns
    const nextExams = await prismaAny.examEntry.findMany({
      where: {
        userId: user.id,
        examDate: {
          gte: now
        }
      },
      orderBy: {
        examDate: 'asc'
      },
      take: 5
    })

    const nextExamsWithCountdown = nextExams.map((exam: any) => {
      const daysUntil = Math.ceil((exam.examDate.getTime() - now.getTime()) / 86400000)
      return {
        subject: exam.subject,
        subjectName: exam.subjectName,
        paperName: exam.paperName,
        examDate: exam.examDate.toISOString().split('T')[0],
        daysUntil
      }
    })

    // STEP 7: Return response
    const isExamModeActive = plan?.planData?.meta?.mode === 'exam'

    // Check if this is subject-wise plan (new format) or old format
    const isSubjectWise = plan?.planData?.formatVersion === 'subject-wise'

    if (isSubjectWise) {
      // Return new subject-wise format with daily subjects and topics
      return NextResponse.json({
        plan: {
          id: plan.id,
          generatedAt: plan.generatedAt,
          firstExamDate: plan.firstExamDate,
          lastExamDate: plan.lastExamDate,
          studyHoursPerDay: plan.studyHoursPerDay,
          mode: isExamModeActive ? 'exam' : 'regular'
        },
        planData: plan.planData, // Full subject-wise plan with phases and days
        stats: {
          totalTasks: totalTasks,
          completedTasks: completedTasks,
          completionPercent: completionPercent
        },
        nextExams: nextExamsWithCountdown,
        examMode: {
          ready: examModeReady,
          active: isExamModeActive,
          daysUntilFirstExam
        }
      })
    }

    // Fall back to old format for backward compatibility
    return NextResponse.json({
      plan: {
        id: plan.id,
        generatedAt: plan.generatedAt,
        firstExamDate: plan.firstExamDate,
        lastExamDate: plan.lastExamDate,
        studyHoursPerDay: plan.studyHoursPerDay,
        mode: isExamModeActive ? 'exam' : 'regular'
      },
      todayTasks,
      weekTasks,
      stats: {
        totalTasks,
        completedTasks,
        completionPercent
      },
      nextExams: nextExamsWithCountdown,
      examMode: {
        ready: examModeReady,
        active: isExamModeActive,
        daysUntilFirstExam
      }
    })
  } catch (error) {
    console.error('Error fetching revision plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revision plan' },
      { status: 500 }
    )
  }
}
