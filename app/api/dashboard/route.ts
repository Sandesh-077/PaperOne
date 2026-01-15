import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPendingRevisions } from '@/lib/revision-scheduler'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Get all data in parallel
  const [
    upcomingExams,
    pendingRevisions,
    recentLearningProjects,
    recentSATSessions,
    studySessions,
    practicePapersWithReminders,
  ] = await Promise.all([
    // Upcoming exams with countdown
    prisma.exam.findMany({
      where: { userId, completed: false },
      include: { subject: true },
      orderBy: { examDate: 'asc' },
      take: 5,
    }),

    // Pending revisions
    getPendingRevisions(userId),

    // Active learning projects
    prisma.learningProject.findMany({
      where: { userId, status: 'in_progress' },
      include: {
        sessions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastStudied: 'desc' },
      take: 5,
    }),

    // Recent SAT sessions
    prisma.sATSession.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    }),

    // Study sessions for streak calculation
    prisma.studySession.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    }),

    // Practice papers needing reminders
    prisma.practicePaper.findMany({
      where: {
        subject: { userId },
        reminderDate: {
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next 3 days
        },
      },
      include: {
        subject: true,
        topic: true,
      },
      orderBy: { reminderDate: 'asc' },
    }),
  ])

  // Calculate exam countdowns
  const examsWithCountdown = upcomingExams.map((exam: any) => {
    const daysRemaining = Math.ceil(
      (new Date(exam.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return { ...exam, daysRemaining }
  })

  // Calculate unified streak (any study activity)
  const calculateStreak = (sessions: any[]) => {
    if (sessions.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const session of sessions) {
      const sessionDate = new Date(session.date)
      sessionDate.setHours(0, 0, 0, 0)

      const daysDiff = Math.floor(
        (today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === streak || daysDiff === streak + 1) {
        streak = daysDiff + 1
      } else {
        break
      }
    }

    return streak
  }

  // Calculate SAT streak
  const satStreak = calculateStreak(recentSATSessions)

  // Calculate general study streak
  const studyStreak = calculateStreak(studySessions)

  // Calculate learning projects streak
  const learningStreak = recentLearningProjects.length > 0
    ? Math.max(...recentLearningProjects.map((p: any) => {
        if (!p.lastStudied) return 0
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(p.lastStudied).getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSince <= 1 ? p.daysSpent : 0
      }))
    : 0

  // Unified streak (maximum of all streaks)
  const unifiedStreak = Math.max(studyStreak, satStreak, learningStreak)

  // Learning projects with progress
  const projectsWithProgress = recentLearningProjects.map((project: any) => ({
    ...project,
    progressPercentage: project.totalUnits
      ? Math.round((project.completedUnits / project.totalUnits) * 100)
      : 0,
  }))

  return NextResponse.json({
    streaks: {
      unified: unifiedStreak,
      study: studyStreak,
      sat: satStreak,
      learning: learningStreak,
    },
    upcomingExams: examsWithCountdown,
    pendingRevisions: pendingRevisions.slice(0, 5), // Top 5
    activeLearningProjects: projectsWithProgress,
    upcomingReminders: practicePapersWithReminders,
    stats: {
      totalExams: upcomingExams.length,
      totalRevisionsDue: pendingRevisions.length,
      activeProjects: recentLearningProjects.length,
    },
  })
}
