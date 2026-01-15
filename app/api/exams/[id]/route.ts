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

  const exam = await prisma.exam.findUnique({
    where: { id: params.id },
  })

  if (!exam || exam.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()

  const updatedExam = await prisma.exam.update({
    where: { id: params.id },
    data,
    include: {
      subject: true,
    },
  })

  return NextResponse.json(updatedExam)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const exam = await prisma.exam.findUnique({
    where: { id: params.id },
  })

  if (!exam || exam.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.exam.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
