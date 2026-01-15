import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subtopic = await prisma.subtopic.findUnique({
    where: { id: params.id },
    include: { topic: { include: { subject: true } } },
  })

  if (!subtopic || subtopic.topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  // If marking as completed for the first time
  if (data.completed && !subtopic.completed) {
    data.completedAt = new Date()
  }

  const updatedSubtopic = await prisma.subtopic.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updatedSubtopic)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subtopic = await prisma.subtopic.findUnique({
    where: { id: params.id },
    include: { topic: { include: { subject: true } } },
  })

  if (!subtopic || subtopic.topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.subtopic.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
