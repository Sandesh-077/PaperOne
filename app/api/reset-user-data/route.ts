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
    await prisma.mistakeLog.deleteMany({
      where: { userId: user.id }
    })

    await prisma.weeklyPerformance.deleteMany({
      where: { userId: user.id }
    })

    await prisma.monthSummary.deleteMany({
      where: { userId: user.id }
    })

    await prisma.topicMastery.deleteMany({
      where: { userId: user.id }
    })

    await prisma.studySession.deleteMany({
      where: { userId: user.id }
    })

    await prisma.error.deleteMany({
      where: { userId: user.id }
    })

    console.log('✅ All user data successfully deleted')
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
