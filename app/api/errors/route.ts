import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const errors = await prisma.error.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(errors)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { category, description, correction, context } = await request.json()

  if (!category || !description || !correction) {
    return NextResponse.json(
      { error: 'Category, description, and correction are required' },
      { status: 400 }
    )
  }

  const error = await prisma.error.create({
    data: {
      userId: session.user.id,
      category,
      description,
      correction,
      context
    }
  })

  return NextResponse.json(error, { status: 201 })
}
