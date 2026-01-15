import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()

  const grammarRule = await prisma.grammarRule.updateMany({
    where: {
      id: params.id,
      userId: session.user.id
    },
    data: {
      ...data,
      learnedAt: data.learned ? new Date() : null
    }
  })

  return NextResponse.json(grammarRule)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.grammarRule.deleteMany({
    where: {
      id: params.id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
