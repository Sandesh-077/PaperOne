import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const body = await req.json()
  const { date, subject, topic, whatWentWrong, correctMethod, formulaOrConcept, mistakeType } = body

  if (!date || !subject || !topic || !whatWentWrong || !mistakeType) {
    return NextResponse.json({error: 'Missing required fields'}, {status: 400})
  }

  try {
    const prismaAny = prisma as any
    const mistake = await prismaAny.mistakeLog.create({
      data: {
        userId: user.id,
        date: new Date(date),
        subject,
        topic,
        whatWentWrong,
        correctMethod,
        formulaOrConcept,
        mistakeType,
        reviewed: false
      }
    })
    return NextResponse.json(mistake)
  } catch (error) {
    console.error('Error creating mistake log:', error)
    return NextResponse.json({error: 'Failed to create mistake log'}, {status: 500})
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '30')

  try {
    const prismaAny = prisma as any
    const mistakes = await prismaAny.mistakeLog.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: limit
    })
    return NextResponse.json(mistakes)
  } catch (error) {
    console.error('Error fetching mistakes:', error)
    return NextResponse.json({error: 'Failed to fetch mistakes'}, {status: 500})
  }
}
