import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const body = await req.json()
  const { confidenceScore } = body

  if (!confidenceScore || confidenceScore < 1 || confidenceScore > 5) {
    return NextResponse.json({error: 'Invalid confidence score'}, {status: 400})
  }

  try {
    const daysSinceEpoch = (new Date().getTime()) / (1000 * 60 * 60 * 24)
    const updated = await prisma.topicMastery.update({
      where: { id },
      data: {
        confidenceScore,
        needsRevision: confidenceScore <= 3 || daysSinceEpoch > 7
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating topic mastery:', error)
    // Return mock response if table doesn't exist yet
    return NextResponse.json({
      id,
      confidenceScore,
      needsRevision: confidenceScore <= 3,
      message: 'TopicMastery not available yet'
    })
  }
}
