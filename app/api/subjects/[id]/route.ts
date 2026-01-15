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

  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
    include: {
      topics: {
        include: {
          subtopics: true,
          _count: {
            select: {
              revisions: true,
              practicePapers: true,
              notes: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
      practicePapers: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!subject || subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(subject)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
  })

  if (!subject || subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  const updatedSubject = await prisma.subject.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updatedSubject)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subject = await prisma.subject.findUnique({
    where: { id: params.id },
  })

  if (!subject || subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.subject.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
