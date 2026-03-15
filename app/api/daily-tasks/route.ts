import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Get optional date query param
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')

    // Determine target date (provided date or today)
    let targetDate = new Date()
    if (dateParam) {
      targetDate = new Date(`${dateParam}T00:00:00Z`)
    } else {
      targetDate.setUTCHours(0, 0, 0, 0)
    }

    // Create date range: 00:00:00 to 23:59:59 UTC
    const dateStart = new Date(targetDate)
    dateStart.setUTCHours(0, 0, 0, 0)
    const dateEnd = new Date(targetDate)
    dateEnd.setUTCHours(23, 59, 59, 999)

    const prismaAny = prisma as any
    const tasks = await prismaAny.dailyTask.findMany({
      where: {
        userId: user.id,
        date: {
          gte: dateStart,
          lte: dateEnd
        }
      },
      orderBy: {
        sessionSlot: 'asc'
      }
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching daily tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily tasks' },
      { status: 500 }
    )
  }
}
