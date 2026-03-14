import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

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

  // Fetch all study sessions in the date range
  const studySessions = await prisma.studySession.findMany({
    where: {
      userId: user.id,
      date: { gte: startDate, lte: endDate }
    },
    select: { date: true, taskType: true, subject: true }
  })

  // Map dates to activities
  const activityMap = new Map<string, Set<string>>()

  studySessions.forEach(session => {
    const dateKey = session.date.toISOString().split('T')[0]
    if (!activityMap.has(dateKey)) {
      activityMap.set(dateKey, new Set())
    }
    if (session.taskType) activityMap.get(dateKey)!.add(session.taskType)
  })

  // Convert to array
  const calendar = Array.from(activityMap.entries()).map(([date, activities]) => ({
    date,
    activities: Array.from(activities),
    sessionCount: studySessions.filter(s => s.date.toISOString().split('T')[0] === date).length
  }))

  return NextResponse.json(calendar)
}
