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

  const { subjectId, name, description, order } = await request.json()

  if (!subjectId || !name) {
    return NextResponse.json(
      { error: 'Subject ID and name are required' },
      { status: 400 }
    )
  }

  // Verify subject belongs to user
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  })

  if (!subject || subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const topic = await prisma.topic.create({
    data: {
      subjectId,
      name,
      description,
      order: order ?? 0,
    },
    include: {
      subtopics: true,
    },
  })

  return NextResponse.json(topic, { status: 201 })
}
