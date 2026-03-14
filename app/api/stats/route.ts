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

  const studySessions = (await prisma.studySession.findMany({
    where: { userId: user.id, date: { gte: startOfYear } },
    orderBy: { date: 'desc' },
    take: 365
  })) as any[]

  // Fetch optional models with error handling
  let topicMastery: any = []
  let mistakeLogs: any = []
  let weeklyPerformance: any = []
  const prismaAny = prisma as any

  try {
    topicMastery = await prismaAny.topicMastery.findMany({
      where: { userId: user.id }
    })
  } catch (err) {
    console.log('TopicMastery not available')
  }

  try {
    mistakeLogs = await prismaAny.mistakeLog.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 100
    })
  } catch (err) {
    console.log('MistakeLog not available')
  }

  try {
    weeklyPerformance = await prismaAny.weeklyPerformance.findMany({
      where: { userId: user.id },
      orderBy: { weekStartDate: 'desc' },
      take: 52
    })
  } catch (err) {
    console.log('WeeklyPerformance not available')
  }

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
  const thisWeekSessions = studySessions.filter((s: any) => new Date(s.date) >= startOfWeek)
  const thisWeekHours = thisWeekSessions.reduce((sum: number, s: any) => sum + (s.totalHours || s.duration || 0), 0)
  const thisWeekPapers = thisWeekSessions.filter((s: any) => (s.taskType === 'PastPaper' || s.activities?.includes?.('PastPaper'))).length

  // Topics needing revision
  const topicsNeedingRevision = topicMastery.filter((t: any) => t.needsRevision).length

  // Recent mistakes
  const recentMistakes = mistakeLogs.slice(0, 5).map((m: any) => ({
    date: m.date ? new Date(m.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    topic: m.topic || 'Unknown',
    type: m.mistakeType || 'Unknown'
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
