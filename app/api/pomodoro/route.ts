import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const data = await req.json()

    const pomodoroSession = await (prisma as any).pomodoroSession.create({
      data: {
        userId: user.id,
        startedAt: new Date(data.startedAt || new Date()),
        endedAt: data.endedAt ? new Date(data.endedAt) : null,
        workMinutes: data.workMinutes || 25,
        breakMinutes: data.breakMinutes || 5,
        cyclesCompleted: data.cyclesCompleted || 0,
        subject: data.subject || null,
        topicName: data.topicName || null,
        status: data.status || 'completed',
        totalMinutes: data.totalMinutes || 0
      }
    })

    return NextResponse.json({ session: pomodoroSession }, { status: 201 })
  } catch (error) {
    console.error('Error creating pomodoro session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // Get Monday of this week
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday,
      0, 0, 0, 0
    ))

    // Fetch last 7 sessions
    const sessions = await (prisma as any).pomodoroSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 7
    })

    // Calculate total minutes this week
    const weekSessions = await (prisma as any).pomodoroSession.findMany({
      where: {
        userId: user.id,
        startedAt: {
          gte: weekStart
        }
      }
    })

    const totalMinutesThisWeek = weekSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0), 0)

    return NextResponse.json({ sessions, totalMinutesThisWeek })
  } catch (error) {
    console.error('Error fetching pomodoro sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
