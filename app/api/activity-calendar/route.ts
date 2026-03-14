import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
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

    try {
      if (month && year) {
        startDate = new Date(`${year}-${month}-01`)
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      } else {
        endDate = new Date()
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 60)
      }
    } catch (err) {
      console.error('Error parsing date params:', err)
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 60)
    }

    // Fetch all study sessions in the date range
    let studySessions: any[] = []
    try {
      studySessions = (await prisma.studySession.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate, lte: endDate }
        }
      })) as any[]
    } catch (err) {
      console.error('Error fetching study sessions:', err)
      studySessions = []
    }

    // Map dates to activities
    const activityMap = new Map<string, Set<string>>()

    studySessions.forEach((session: any) => {
      try {
        const dateKey = new Date(session.date).toISOString().split('T')[0]
        if (!activityMap.has(dateKey)) {
          activityMap.set(dateKey, new Set())
        }
        if (session.taskType) activityMap.get(dateKey)!.add(session.taskType)
        if (session.activities) {
          session.activities.forEach((activity: string) => activityMap.get(dateKey)!.add(activity))
        }
      } catch (err) {
        console.error('Error processing session:', err, session)
      }
    })

    // Convert to array
    const calendar = Array.from(activityMap.entries()).map(([date, activities]) => ({
      date,
      activities: Array.from(activities),
      sessionCount: studySessions.filter(s => {
        try {
          return new Date(s.date).toISOString().split('T')[0] === date
        } catch (e) {
          return false
        }
      }).length
    }))

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Activity calendar error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar data', details: String(error) },
      { status: 500 }
    )
  }
}
