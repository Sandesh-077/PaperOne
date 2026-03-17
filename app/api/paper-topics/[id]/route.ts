import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // Verify ownership
    const existing = await (prisma as any).paperTopic.findUnique({ where: { id: params.id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const data = await req.json()
    
    // Auto-set needsRevision based on confidenceScore
    if (data.confidenceScore !== undefined) {
      data.needsRevision = data.confidenceScore <= 2
    }

    const topic = await (prisma as any).paperTopic.update({
      where: { id: params.id },
      data
    })

    return NextResponse.json({ topic })
  } catch (error) {
    console.error('Error updating paper topic:', error)
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // Verify ownership
    const existing = await (prisma as any).paperTopic.findUnique({ where: { id: params.id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    await (prisma as any).paperTopic.delete({ where: { id: params.id } })

    return NextResponse.json({ message: 'Topic deleted' })
  } catch (error) {
    console.error('Error deleting paper topic:', error)
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 })
  }
}
