import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subjects = await prisma.subject.findMany({
    where: { userId: session.user.id },
    include: {
      topics: {
        include: {
          subtopics: true,
        },
      },
      _count: {
        select: {
          topics: true,
          practicePapers: true,
          notes: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(subjects)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, type, level, color, icon } = await request.json()

  if (!name || !type) {
    return NextResponse.json(
      { error: 'Name and type are required' },
      { status: 400 }
    )
  }

  const subject = await prisma.subject.create({
    data: {
      userId: session.user.id,
      name,
      type,
      level,
      color,
      icon,
    },
  })

  return NextResponse.json(subject, { status: 201 })
}
