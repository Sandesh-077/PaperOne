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

  const practicePaper = await prisma.practicePaper.findUnique({
    where: { id: params.id },
    include: { subject: true },
  })

  if (!practicePaper || practicePaper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  // Recalculate reminder date if reminderDays changed
  if (data.reminderDays && data.reminderDays !== practicePaper.reminderDays) {
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + data.reminderDays)
    data.reminderDate = reminderDate
  }

  const updatedPracticePaper = await prisma.practicePaper.update({
    where: { id: params.id },
    data,
    include: {
      subject: true,
      topic: true,
    },
  })

  return NextResponse.json(updatedPracticePaper)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const practicePaper = await prisma.practicePaper.findUnique({
    where: { id: params.id },
    include: { subject: true },
  })

  if (!practicePaper || practicePaper.subject.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.practicePaper.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
