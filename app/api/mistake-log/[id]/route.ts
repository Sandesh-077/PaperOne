import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const body = await req.json()
  const { reviewed } = body

  try {
    const updated = await prisma.mistakeLog.update({
      where: { id },
      data: { reviewed }
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating mistake log:', error)
    return NextResponse.json({error: 'Failed to update mistake log'}, {status: 500})
  }
}
