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

  const essay = await prisma.essay.findFirst({
    where: {
      id: params.id,
      userId: session.user.id
    }
  })

  if (!essay) {
    return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
  }

  return NextResponse.json(essay)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await request.json()

  if (data.content) {
    data.wordCount = data.content.trim().split(/\s+/).length
  }

  const essay = await prisma.essay.updateMany({
    where: {
      id: params.id,
      userId: session.user.id
    },
    data
  })

  return NextResponse.json(essay)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.essay.deleteMany({
    where: {
      id: params.id,
      userId: session.user.id
    }
  })

  return NextResponse.json({ success: true })
}
