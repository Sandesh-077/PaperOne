import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scheduleRevisions } from '@/lib/revision-scheduler'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: { subject: true },
  })

  if (!topic || topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  // If marking as completed for the first time, schedule revisions
  if (data.completed && !topic.completed) {
    data.completedAt = new Date()
    
    // Schedule revisions based on forgetting curve
    await scheduleRevisions(params.id)
  }

  const updatedTopic = await prisma.topic.update({
    where: { id: params.id },
    data,
    include: {
      subtopics: true,
      revisions: {
        where: { completed: false },
        orderBy: { scheduledFor: 'asc' },
      },
    },
  })

  return NextResponse.json(updatedTopic)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.id },
    include: { subject: true },
  })

  if (!topic || topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.topic.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
