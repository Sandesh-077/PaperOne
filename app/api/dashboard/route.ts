import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

    // Get study sessions for streak and stats
    let studySessions: any[] = []
    try {
      studySessions = (await prisma.studySession.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 30
      })) as any[]
    } catch (err) {
      console.error('Error fetching study sessions:', err)
      studySessions = []
    }

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
      try {
        if (sessions.length === 0) return 0

        let streak = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const uniqueDates = [...new Set(sessions.map(s => {
          try {
            const d = new Date(s.date)
            d.setHours(0, 0, 0, 0)
            return d.getTime()
          } catch (e) {
            return null
          }
        }))].filter((d): d is number => d !== null).sort((a, b) => b - a)

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
      } catch (err) {
        console.error('Error calculating streak:', err)
        return 0
      }
    }

    // Get this week's stats
    let weekSessions: any[] = []
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      weekSessions = (await prisma.studySession.findMany({
        where: {
          userId: user.id,
          date: { gte: weekStart }
        }
      })) as any[]
    } catch (err) {
      console.error('Error fetching week sessions:', err)
      weekSessions = []
    }

    const totalHoursThisWeek = weekSessions.reduce((sum: number, s: any) => sum + (s.totalHours || s.duration || 0), 0)
    const pastPapersThisWeek = weekSessions.filter((s: any) => (s.taskType === 'PastPaper' || s.activities?.includes?.('PastPaper'))).length

    return NextResponse.json({
      streaks: {
        current: calculateStreak(studySessions),
        daysActive: new Set(studySessions.map(s => {
          try {
            return new Date(s.date).toISOString().split('T')[0]
          } catch (e) {
            return null
          }
        }).filter(Boolean)).size
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
      recentSessions: studySessions.slice(0, 5).map((s: any) => {
        try {
          return {
            date: new Date(s.date).toISOString().split('T')[0],
            subject: s.subject || 'Unknown',
            topic: s.topic || 'Unknown',
            hours: s.totalHours || s.duration || 0
          }
        } catch (e) {
          return {
            date: 'Unknown',
            subject: 'Unknown',
            topic: 'Unknown',
            hours: 0
          }
        }
      })
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { 
        streaks: { current: 0, daysActive: 0 },
        thisWeek: { totalHours: 0, pastPapers: 0, sessionsCompleted: 0 },
        topicsNeedingRevision: [],
        recentSessions: [],
        error: String(error)
      },
      { status: 500 }
    )
  }
}
