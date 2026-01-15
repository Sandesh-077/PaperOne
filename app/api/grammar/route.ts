import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const grammarRules = await prisma.grammarRule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(grammarRules)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, explanation, examples, category, status } = await request.json()

  if (!title || !explanation) {
    return NextResponse.json(
      { error: 'Title and explanation are required' },
      { status: 400 }
    )
  }

  const grammarRule = await prisma.grammarRule.create({
    data: {
      userId: session.user.id,
      title,
      explanation,
      examples: examples || [],
      category,
      status: status || 'needs_work'
    }
  })

  return NextResponse.json(grammarRule, { status: 201 })
}
