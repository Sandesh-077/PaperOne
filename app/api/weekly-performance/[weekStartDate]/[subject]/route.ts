import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Calculate weekly performance for a given subject and week
export async function GET(
  req: Request,
  { params }: { params: Promise<{ weekStartDate: string; subject: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { weekStartDate, subject } = await params
  const startDate = new Date(weekStartDate)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  try {
    // Get all study sessions for this week and subject
    const sessions = await prisma.studySession.findMany({
      where: {
        userId: user.id,
        subject: subject,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        date: true,
        totalHours: true,
        taskType: true,
        accuracy: true,
        deepFocusScore: true,
        distractionCount: true
      }
    })

    // Calculate weekly metrics
    const totalHours = sessions.reduce((sum, s) => sum + (s.totalHours || 0), 0)
    const pastPapers = sessions.filter(s => s.taskType === 'PastPaper').length
    const avgAccuracy = sessions.length > 0
      ? sessions.filter(s => s.accuracy).reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.filter(s => s.accuracy).length
      : 0
    const avgFocus = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.deepFocusScore || 5), 0) / sessions.length
      : 0
    const totalDistractions = sessions.reduce((sum, s) => sum + (s.distractionCount || 0), 0)

    // Calculate component scores (formula)
    const studyHoursScore = Math.min((totalHours / 35) * 25, 25) // 35 hours = 25 points
    const accuracyScore = (avgAccuracy / 100) * 30 // 100% = 30 points
    const focusScore = (avgFocus / 10) * 20 // 10 = 20 points
    const papersScore = Math.min((pastPapers / 5) * 15, 15) // 5 papers = 15 points
    const distractionScore = Math.max(10 - (totalDistractions * 0.5), 0) // 0 = 10 points, -0.5 per distraction

    const weeklyRating = Math.round(studyHoursScore + accuracyScore + focusScore + papersScore + distractionScore)

    // Get previous week rating for delta
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - 7)
    const prevEndDate = new Date(prevStartDate)
    prevEndDate.setDate(prevStartDate.getDate() + 6)

    const prevSessions = await prisma.studySession.findMany({
      where: {
        userId: user.id,
        subject: subject,
        date: {
          gte: prevStartDate,
          lte: prevEndDate
        }
      },
      select: {
        id: true,
        date: true,
        totalHours: true,
        taskType: true,
        accuracy: true,
        deepFocusScore: true,
        distractionCount: true
      }
    })

    const prevTotalHours = prevSessions.reduce((sum, s) => sum + (s.totalHours || 0), 0)
    const prevPapers = prevSessions.filter(s => s.taskType === 'PastPaper').length
    const prevAvgAccuracy = prevSessions.length > 0
      ? prevSessions.filter(s => s.accuracy).reduce((sum, s) => sum + (s.accuracy || 0), 0) / prevSessions.filter(s => s.accuracy).length
      : 0
    const prevAvgFocus = prevSessions.length > 0
      ? prevSessions.reduce((sum, s) => sum + (s.deepFocusScore || 5), 0) / prevSessions.length
      : 0
    const prevTotalDistractions = prevSessions.reduce((sum, s) => sum + (s.distractionCount || 0), 0)

    const prevStudyScore = Math.min((prevTotalHours / 35) * 25, 25)
    const prevAccuracyScore = (prevAvgAccuracy / 100) * 30
    const prevFocusScore = (prevAvgFocus / 10) * 20
    const prevPapersScore = Math.min((prevPapers / 5) * 15, 15)
    const prevDistractionScore = Math.max(10 - (prevTotalDistractions * 0.5), 0)

    const prevWeeklyRating = Math.round(prevStudyScore + prevAccuracyScore + prevFocusScore + prevPapersScore + prevDistractionScore)
    const deltaPreviousWeek = weeklyRating - prevWeeklyRating

    // Determine grade label
    const getGradeLabel = (rating: number) => {
      if (rating >= 85) return 'Elite'
      if (rating >= 70) return 'Strong'
      if (rating >= 50) return 'Building'
      if (rating >= 30) return 'Weak'
      return 'Lock In'
    }

    return NextResponse.json({
      subject,
      weekStartDate: startDate.toISOString().split('T')[0],
      weekEndDate: endDate.toISOString().split('T')[0],
      weeklyRating,
      gradeLabel: getGradeLabel(weeklyRating),
      deltaPreviousWeek,
      studyHoursScore: Math.round(studyHoursScore),
      accuracyScore: Math.round(accuracyScore),
      focusScore: Math.round(focusScore),
      papersScore: Math.round(papersScore),
      distractionScore: Math.round(distractionScore)
    })
  } catch (error) {
    console.error('Error calculating weekly performance:', error)
    return NextResponse.json({error: 'Failed to calculate weekly performance'}, {status: 500})
  }
}
