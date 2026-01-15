import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vocabulary = await prisma.vocabulary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(vocabulary)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { word, definition, sentences, category } = await request.json()

  if (!word || !definition || !sentences || sentences.length === 0) {
    return NextResponse.json(
      { error: 'Word, definition, and at least one sentence are required' },
      { status: 400 }
    )
  }

  const vocab = await prisma.vocabulary.create({
    data: {
      userId: session.user.id,
      word,
      definition,
      sentences: sentences || [],
      category
    }
  })

  return NextResponse.json(vocab, { status: 201 })
}
