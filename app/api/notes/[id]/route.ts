import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
      topic: { include: { subject: true } },
      subtopic: { include: { topic: { include: { subject: true } } } },
    },
  })

  if (!note) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Check ownership
  const userId =
    note.subject?.userId ||
    note.topic?.subject?.userId ||
    note.subtopic?.topic?.subject?.userId

  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Update last viewed timestamp
  await prisma.note.update({
    where: { id: params.id },
    data: { lastViewedAt: new Date() },
  })

  return NextResponse.json(note)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
      topic: { include: { subject: true } },
      subtopic: { include: { topic: { include: { subject: true } } } },
    },
  })

  if (!note) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const userId =
    note.subject?.userId ||
    note.topic?.subject?.userId ||
    note.subtopic?.topic?.subject?.userId

  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()

  const updatedNote = await prisma.note.update({
    where: { id: params.id },
    data,
    include: {
      subject: true,
      topic: true,
      subtopic: true,
    },
  })

  return NextResponse.json(updatedNote)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const note = await prisma.note.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
      topic: { include: { subject: true } },
      subtopic: { include: { topic: { include: { subject: true } } } },
    },
  })

  if (!note) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const userId =
    note.subject?.userId ||
    note.topic?.subject?.userId ||
    note.subtopic?.topic?.subject?.userId

  if (userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.note.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
