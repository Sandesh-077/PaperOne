import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM format
  const year = searchParams.get('year')

  const userId = session.user.id

  // Calculate date range (last 60 days if no month specified)
  let startDate: Date
  let endDate: Date

  if (month && year) {
    startDate = new Date(`${year}-${month}-01`)
    endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
  } else {
    endDate = new Date()
    startDate = new Date()
    startDate.setDate(startDate.getDate() - 60)
  }

  // Fetch all activities in parallel
  const [
    studySessions,
    satSessions,
    learningSessions,
    grammarRules,
    vocabulary,
    essays,
    errors,
  ] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, activities: true },
    }),
    prisma.sATSession.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, topic: true },
    }),
    prisma.learningSession.findMany({
      where: {
        project: { userId },
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true, unitsCompleted: true },
    }),
    prisma.grammarRule.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    }),
    prisma.vocabulary.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    }),
    prisma.essay.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    }),
    prisma.error.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true },
    }),
  ])

  // Aggregate activities by day
  const activityMap = new Map<string, Set<string>>()

  const addActivity = (date: Date, activity: string) => {
    const dateKey = date.toISOString().split('T')[0]
    if (!activityMap.has(dateKey)) {
      activityMap.set(dateKey, new Set())
    }
    activityMap.get(dateKey)!.add(activity)
  }

  // Process each activity type
  studySessions.forEach(s => {
    addActivity(new Date(s.date), 'study')
    s.activities.forEach((act: string) => addActivity(new Date(s.date), act))
  })

  satSessions.forEach(s => addActivity(new Date(s.date), 'sat'))
  learningSessions.forEach(s => addActivity(new Date(s.date), 'learning'))
  grammarRules.forEach(g => addActivity(new Date(g.createdAt), 'grammar'))
  vocabulary.forEach(v => addActivity(new Date(v.createdAt), 'vocabulary'))
  essays.forEach(e => addActivity(new Date(e.createdAt), 'essay'))
  errors.forEach(e => addActivity(new Date(e.createdAt), 'error'))

  // Convert to array format
  const calendar = Array.from(activityMap.entries()).map(([date, activities]) => ({
    date,
    activities: Array.from(activities),
  }))

  return NextResponse.json(calendar)
}
