import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { subject: true },
  })

  if (!topic || topic.subject.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()

  const updatedTopic = await prisma.topic.update({
    where: { id },
    data,
    include: {
      subtopics: true,
    },
  })

  return NextResponse.json(updatedTopic)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: { subject: true },
  })

  if (!topic || topic.subject.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.topic.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
