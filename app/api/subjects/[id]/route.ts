import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      topics: {
        include: {
          subtopics: true
        },
        orderBy: { order: 'asc' },
      }
    },
  })

  if (!subject || subject.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get past papers from study sessions for this subject
  const pastPapers = (await (prisma.studySession.findMany as any)({
    where: {
      userId: user.id
    },
    orderBy: { date: 'desc' }
  })) as any[]

  // Filter by subject and taskType since schema may not support these fields yet
  const filteredPapers = pastPapers.filter((p: any) => 
    (p.taskType === 'PastPaper' || p.activities?.includes?.('PastPaper')) &&
    (p.subject === subject.name || subject.name.includes('study'))
  )

  return NextResponse.json({
    ...subject,
    pastPapers: filteredPapers.map((p: any) => ({
      id: p.id,
      paperCode: p.paperCode || null,
      paperYear: p.paperYear || null,
      date: p.date,
      totalHours: p.totalHours || p.duration || 0,
      accuracy: p.accuracy || null
    }))
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const subject = await prisma.subject.findUnique({
    where: { id },
  })

  if (!subject || subject.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  const updatedSubject = await prisma.subject.update({
    where: { id },
    data,
  })

  return NextResponse.json(updatedSubject)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { id } = await params
  const subject = await prisma.subject.findUnique({
    where: { id },
  })

  if (!subject || subject.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.subject.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
