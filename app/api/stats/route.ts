import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [
    studySessions,
    topicMastery,
    mistakeLogs,
    weeklyPerformance
  ] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId: user.id, date: { gte: startOfYear } },
      orderBy: { date: 'desc' },
      take: 365,
      select: {
        id: true,
        date: true,
        totalHours: true,
        taskType: true
      }
    }),
    prisma.topicMastery.findMany({
      where: { userId: user.id }
    }),
    prisma.mistakeLog.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 100
    }),
    prisma.weeklyPerformance.findMany({
      where: { userId: user.id },
      orderBy: { weekStartDate: 'desc' },
      take: 52
    })
  ])

  // Calculate streaks
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let lastDate: Date | null = null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (const studySession of studySessions) {
    const sessionDate = new Date(studySession.date)
    sessionDate.setHours(0, 0, 0, 0)
    
    if (!lastDate) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (sessionDate.getTime() === today.getTime() || sessionDate.getTime() === yesterday.getTime()) {
        currentStreak = 1
        tempStreak = 1
        lastDate = sessionDate
      } else {
        tempStreak = 1
        lastDate = sessionDate
      }
    } else {
      const dayDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 1) {
        tempStreak++
        if (currentStreak > 0) currentStreak++
        lastDate = sessionDate
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
        lastDate = sessionDate
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  // This week stats
  const thisWeekSessions = studySessions.filter(s => new Date(s.date) >= startOfWeek)
  const thisWeekHours = thisWeekSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0)
  const thisWeekPapers = thisWeekSessions.filter(s => s.taskType === 'PastPaper').length

  // Topics needing revision
  const topicsNeedingRevision = topicMastery.filter(t => t.needsRevision).length

  // Recent mistakes
  const recentMistakes = mistakeLogs.slice(0, 5).map(m => ({
    date: m.date.toISOString().split('T')[0],
    topic: m.topic,
    type: m.mistakeType
  }))

  return NextResponse.json({
    streaks: {
      current: currentStreak,
      longest: longestStreak,
      totalDays: new Set(studySessions.map(s => s.date.toISOString().split('T')[0])).size
    },
    thisWeek: {
      totalHours: Math.round(thisWeekHours * 100) / 100,
      pastPapers: thisWeekPapers,
      sessions: thisWeekSessions.length
    },
    overall: {
      totalSessions: studySessions.length,
      totalTopics: topicMastery.length,
      topicsNeedingRevision,
      totalMistakesLogged: mistakeLogs.length
    },
    recentMistakes
  })
}
