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

  const data = await request.json()

  const error = await prisma.error.updateMany({
    where: {
      id: params.id,
      userId: session.user.id
    },
    data: {
      ...data,
      resolvedAt: data.resolved ? new Date() : null
    }
  })

  return NextResponse.json(error)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.error.deleteMany({
    where: {
      id: params.id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
