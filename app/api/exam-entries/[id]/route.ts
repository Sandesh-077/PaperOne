import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const prismaAny = prisma as any
    const entry = await prismaAny.examEntry.findUnique({
      where: { id: params.id }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Exam entry not found' }, { status: 404 })
    }

    // Verify ownership
    if (entry.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prismaAny.examEntry.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exam entry:', error)
    return NextResponse.json({ error: 'Failed to delete exam entry' }, { status: 500 })
  }
}
