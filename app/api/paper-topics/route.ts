import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const url = new URL(req.url)
    const subject = url.searchParams.get('subject')
    const paperCode = url.searchParams.get('paperCode')

    console.log('📋 Fetching topics - user:', user.id, 'subject:', subject, 'paperCode:', paperCode)

    const where: any = { userId: user.id }
    if (subject) where.subject = subject
    if (paperCode) where.paperCode = paperCode

    const topics = await (prisma as any).paperTopic.findMany({
      where,
      orderBy: [{ paperCode: 'asc' }, { topicOrder: 'asc' }]
    })

    console.log('✅ Topics found:', topics.length)
    return NextResponse.json({ topics })
  } catch (error: any) {
    console.error('❌ Error fetching paper topics:')
    console.error('  Name:', error.name)
    console.error('  Message:', error.message)
    console.error('  Code:', error.code)
    console.error('  Stack:', error.stack)
    return NextResponse.json({ 
      error: 'Failed to fetch topics', 
      details: error.message,
      code: error.code 
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const data = await req.json()

    const topic = await (prisma as any).paperTopic.create({
      data: {
        userId: user.id,
        subject: data.subject,
        subjectName: data.subjectName,
        paperCode: data.paperCode,
        paperName: data.paperName,
        topicName: data.topicName,
        topicOrder: data.topicOrder || 0,
        source: data.source || 'custom'
      }
    })

    return NextResponse.json({ topic }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating paper topic:', error)
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Topic already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
  }
}
