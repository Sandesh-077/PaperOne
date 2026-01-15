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

  const revision = await prisma.revision.findUnique({
    where: { id: params.id },
    include: { topic: { include: { subject: true } } },
  })

  if (!revision || revision.topic.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  // If marking as completed for the first time
  if (data.completed && !revision.completed) {
    data.completedAt = new Date()
  }

  const updatedRevision = await prisma.revision.update({
    where: { id: params.id },
    data,
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
  })

  return NextResponse.json(updatedRevision)
}
