import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ExamEntryInput } from '@/types/planner'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const prismaAny = prisma as any
    const entries = await prismaAny.examEntry.findMany({
      where: { userId: user.id },
      orderBy: { examDate: 'asc' }
    })
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Error fetching exam entries:', error)
    return NextResponse.json({ error: 'Failed to fetch exam entries' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const data: ExamEntryInput = await req.json()

  // Validate required fields
  const { subject, subjectName, paperCode, paperName, examDate, timeSlot } = data
  if (!subject || !subjectName || !paperCode || !paperName || !examDate || !timeSlot) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const prismaAny = prisma as any
    const entry = await prismaAny.examEntry.create({
      data: {
        userId: user.id,
        subject,
        subjectName,
        paperCode,
        paperName,
        examDate: new Date(examDate),
        timeSlot,
        previousScore: data.previousScore || null,
        targetScore: data.targetScore || null,
        color: data.color || null
      }
    })
    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Error creating exam entry:', error)
    return NextResponse.json({ error: 'Failed to create exam entry' }, { status: 500 })
  }
}
