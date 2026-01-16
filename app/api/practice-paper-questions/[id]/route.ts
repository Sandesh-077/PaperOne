import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Update question status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await prisma.practicePaperQuestion.findUnique({
    where: { id: params.id },
    include: { practicePaper: { include: { subject: true } } },
  })

  if (!question || question.practicePaper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  const updatedQuestion = await prisma.practicePaperQuestion.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updatedQuestion)
}

// Delete question
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await prisma.practicePaperQuestion.findUnique({
    where: { id: params.id },
    include: { practicePaper: { include: { subject: true } } },
  })

  if (!question || question.practicePaper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.practicePaperQuestion.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
