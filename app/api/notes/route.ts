import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const subjectId = searchParams.get('subjectId')
  const topicId = searchParams.get('topicId')
  const subtopicId = searchParams.get('subtopicId')

  const where: any = {}

  if (subjectId) {
    where.subjectId = subjectId
  }

  if (topicId) {
    where.topicId = topicId
  }

  if (subtopicId) {
    where.subtopicId = subtopicId
  }

  // Only get notes that belong to user's subjects
  const notes = await prisma.note.findMany({
    where: {
      ...where,
      OR: [
        { subject: { userId: session.user.id } },
        { topic: { subject: { userId: session.user.id } } },
        { subtopic: { topic: { subject: { userId: session.user.id } } } },
      ],
    },
    include: {
      subject: true,
      topic: true,
      subtopic: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notes)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subjectId, topicId, subtopicId, title, content, fileUrl, fileType, lastPosition } =
    await request.json()

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Verify ownership
  if (subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })
    if (!subject || subject.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const note = await prisma.note.create({
    data: {
      subjectId,
      topicId,
      subtopicId,
      title,
      content,
      fileUrl,
      fileType,
      lastPosition,
    },
    include: {
      subject: true,
      topic: true,
      subtopic: true,
    },
  })

  return NextResponse.json(note, { status: 201 })
}
