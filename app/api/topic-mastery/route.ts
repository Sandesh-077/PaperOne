import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  try {
    const topics = await prisma.topicMastery.findMany({
      where: { userId: user.id }
    })
    return NextResponse.json(topics)
  } catch (error) {
    console.error('Error fetching topic mastery:', error)
    return NextResponse.json({error: 'Failed to fetch topics'}, {status: 500})
  }
}
