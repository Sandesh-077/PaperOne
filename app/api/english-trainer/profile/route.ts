import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
    // Fetch or create EnglishProfile
    const profile = await (prisma as any).englishProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        grammarLevel: 1,
        vocabLevel: 1,
        writingLevel: 1,
        overallScore: 0,
        gpReadiness: 0,
        satReadiness: 0,
        ieltsEstimate: 0,
        uniReadiness: 0,
        totalSessions: 0,
        streak: 0
      }
    })

    // Fetch last 30 TrainerSession records
    const recentSessions = await (prisma as any).trainerSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    // Count learned items by type
    const grammarCount = await (prisma as any).learnedItem.count({
      where: { userId: user.id, itemType: 'grammar' }
    })

    const vocabCount = await (prisma as any).learnedItem.count({
      where: { userId: user.id, itemType: 'vocab' }
    })

    // Check if streak is active (lastActiveDate was today or yesterday)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let streakActive = false
    if (profile.lastActiveDate) {
      const lastActive = new Date(profile.lastActiveDate)
      lastActive.setHours(0, 0, 0, 0)
      const diffTime = today.getTime() - lastActive.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      streakActive = diffDays <= 1
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        userId: profile.userId,
        grammarLevel: profile.grammarLevel,
        vocabLevel: profile.vocabLevel,
        writingLevel: profile.writingLevel,
        overallScore: profile.overallScore,
        gpReadiness: profile.gpReadiness,
        satReadiness: profile.satReadiness,
        ieltsEstimate: profile.ieltsEstimate,
        uniReadiness: profile.uniReadiness,
        totalSessions: profile.totalSessions,
        streak: profile.streak,
        lastActiveDate: profile.lastActiveDate,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      },
      recentSessions,
      learnedCounts: {
        grammar: grammarCount,
        vocab: vocabCount
      },
      streakActive
    })
  } catch (error: any) {
    console.error('Fetch profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
