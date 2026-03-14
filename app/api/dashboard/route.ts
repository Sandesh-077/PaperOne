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

  // Get study sessions for streak and stats
  const studySessions = (await prisma.studySession.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 30
  })) as any[]

  // Get topics needing revision
  let topicsNeedingRevision: any[] = []
  try {
    const prismaAny = prisma as any
    topicsNeedingRevision = await prismaAny.topicMastery.findMany({
      where: {
        userId: user.id,
        needsRevision: true
      },
      take: 5
    })
  } catch (err) {
    console.log('TopicMastery not available')
    topicsNeedingRevision = []
  }

  // Calculate streak
  const calculateStreak = (sessions: any[]) => {
    if (sessions.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueDates = [...new Set(sessions.map(s => {
      const d = new Date(s.date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }))].sort((a, b) => b - a)

    if (uniqueDates.length === 0) return 0

    const mostRecentDate = new Date(uniqueDates[0])
    const daysSinceRecent = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceRecent > 1) return 0

    streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i])
      const prevDate = new Date(uniqueDates[i - 1])
      const daysDiff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) streak++
      else break
    }

    return streak
  }

  // Get this week's stats
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const weekSessions = (await prisma.studySession.findMany({
    where: {
      userId: user.id,
      date: { gte: weekStart }
    }
  })) as any[]

  const totalHoursThisWeek = weekSessions.reduce((sum: number, s: any) => sum + (s.totalHours || s.duration || 0), 0)
  const pastPapersThisWeek = weekSessions.filter((s: any) => (s.taskType === 'PastPaper' || s.activities?.includes?.('PastPaper'))).length

  return NextResponse.json({
    streaks: {
      current: calculateStreak(studySessions),
      daysActive: new Set(studySessions.map(s => s.date.toISOString().split('T')[0])).size
    },
    thisWeek: {
      totalHours: Math.round(totalHoursThisWeek * 100) / 100,
      pastPapers: pastPapersThisWeek,
      sessionsCompleted: weekSessions.length
    },
    topicsNeedingRevision: topicsNeedingRevision.map((t: any) => ({
      id: t.id,
      subject: t.subject,
      topic: t.topicName,
      confidenceScore: t.confidenceScore
    })),
    recentSessions: studySessions.slice(0, 5).map((s: any) => ({
      date: s.date.toISOString().split('T')[0],
      subject: s.subject || 'Unknown',
      topic: s.topic || 'Unknown',
      hours: s.totalHours || s.duration || 0
    }))
  })
}
