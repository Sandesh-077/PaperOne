import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Calculate month summary for a given subject and month
export async function GET(
  req: Request,
  { params }: { params: Promise<{ monthYear: string; subject: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { monthYear, subject } = await params
  const [year, month] = monthYear.split('-').map(Number)

  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    // Get all study sessions for this month and subject
    const sessions = (await prisma.studySession.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    })) as any[]

    // Calculate monthly metrics
    const totalStudyHours = sessions.reduce((sum: number, s: any) => sum + (s.totalHours || s.duration || 0), 0)
    const totalPapers = sessions.filter((s: any) => (s.taskType === 'PastPaper' || s.activities?.includes?.('PastPaper'))).length
    const validSessions = sessions.filter((s: any) => s.accuracy !== null && s.accuracy !== undefined)
    const averageAccuracy = validSessions.length > 0
      ? validSessions.reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) / validSessions.length
      : 0

    // Calculate weekly ratings for this month
    const weeks = Math.ceil((endDate.getDate()) / 7)
    const weeklyRatings = []

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(year, month - 1, week * 7 + 1)
      const weekEnd = new Date(year, month - 1, (week + 1) * 7)

      const weekSessions = sessions.filter(
        s => new Date(s.date) >= weekStart && new Date(s.date) <= weekEnd
      )

      const weeklyHours = weekSessions.reduce((sum: number, s: any) => sum + (s.totalHours || s.duration || 0), 0)
      const weeklyAccuracy = weekSessions.length > 0
        ? weekSessions.filter((s: any) => s.accuracy).reduce((sum: number, s: any) => sum + (s.accuracy || 0), 0) / weekSessions.filter((s: any) => s.accuracy).length
        : 0
      const weeklyFocus = weekSessions.length > 0
        ? weekSessions.reduce((sum: number, s: any) => sum + (s.deepFocusScore || 5), 0) / weekSessions.length
        : 0

      const studyScore = Math.min((weeklyHours / 35) * 25, 25)
      const accuracyScore = (weeklyAccuracy / 100) * 30
      const focusScore = (weeklyFocus / 10) * 20
      const papersCount = weekSessions.filter((s: any) => (s.taskType === 'PastPaper' || s.activities?.includes?.('PastPaper'))).length
      const papersScore = Math.min((papersCount / 5) * 15, 15)
      const disturbances = weekSessions.reduce((sum: number, s: any) => sum + (s.distractionCount || 0), 0)
      const distractionScore = Math.max(10 - (disturbances * 0.5), 0)

      const rating = Math.round(studyScore + accuracyScore + focusScore + papersScore + distractionScore)
      weeklyRatings.push(rating)
    }

    const bestWeekRating = Math.max(...weeklyRatings, 0)
    const worstWeekRating = Math.min(...weeklyRatings, 0)
    const week4MinusWeek1 = weeklyRatings.length > 0
      ? (weeklyRatings[weeklyRatings.length - 1] || 0) - (weeklyRatings[0] || 0)
      : 0

    const avgMonthly = weeklyRatings.length > 0
      ? Math.round(weeklyRatings.reduce((a, b) => a + b) / weeklyRatings.length)
      : 0

    const getGrade = (rating: number) => {
      if (rating >= 85) return 'Elite'
      if (rating >= 70) return 'Strong'
      if (rating >= 50) return 'Building'
      if (rating >= 30) return 'Weak'
      return 'Lock In'
    }

    return NextResponse.json({
      subject,
      monthYear,
      totalStudyHours: Math.round(totalStudyHours * 100) / 100,
      totalPapers,
      averageAccuracy: Math.round(averageAccuracy),
      bestWeekRating,
      worstWeekRating,
      week4MinusWeek1,
      monthGrade: getGrade(avgMonthly)
    })
  } catch (error) {
    console.error('Error calculating month summary:', error)
    return NextResponse.json({error: 'Failed to calculate month summary'}, {status: 500})
  }
}
