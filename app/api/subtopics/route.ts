import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topicId, name, description, order } = await request.json()

  if (!topicId || !name) {
    return NextResponse.json(
      { error: 'Topic ID and name are required' },
      { status: 400 }
    )
  }

  // Verify topic belongs to user
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { subject: true },
  })

  if (!topic || topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subtopic = await prisma.subtopic.create({
    data: {
      topicId,
      name,
      description,
      order: order ?? 0,
    },
  })

  return NextResponse.json(subtopic, { status: 201 })
}
