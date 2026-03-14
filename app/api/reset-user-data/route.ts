import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  try {
    console.log('🗑️  Starting user data reset...')
    
    // Delete all user-related data
    const prismaAny = prisma as any
    try {
      await prismaAny.mistakeLog.deleteMany({
        where: { userId: user.id }
      })
    } catch (err) {
      console.log('MistakeLog not available')
    }

    try {
      await prismaAny.weeklyPerformance.deleteMany({
        where: { userId: user.id }
      })
    } catch (err) {
      console.log('WeeklyPerformance not available')
    }

    try {
      await prismaAny.monthSummary.deleteMany({
        where: { userId: user.id }
      })
    } catch (err) {
      console.log('MonthSummary not available')
    }

    try {
      await prismaAny.topicMastery.deleteMany({
        where: { userId: user.id }
      })
    } catch (err) {
      console.log('TopicMastery not available')
    }

    await prisma.studySession.deleteMany({
      where: { userId: user.id }
    })

    try {
      await prisma.error.deleteMany({
        where: { userId: user.id }
      })
    } catch (err) {
      console.log('Error table not available')
    }

    console.log('✅ All available user data successfully deleted')
    return NextResponse.json({
      success: true,
      message: 'All user data has been reset. You can start fresh!',
    })
  } catch (error: any) {
    console.error('❌ Error resetting user data:', error)
    return NextResponse.json(
      { error: 'Failed to reset user data: ' + error.message },
      { status: 500 }
    )
  }
}
