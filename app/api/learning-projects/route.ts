import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.learningProject.findMany({
    where: { userId: session.user.id },
    include: {
      sessions: {
        orderBy: { date: 'desc' },
        take: 5, // Last 5 sessions
      },
      _count: {
        select: {
          sessions: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Calculate progress percentage
  const projectsWithProgress = projects.map(project => {
    const progressPercentage = project.totalUnits
      ? Math.round((project.completedUnits / project.totalUnits) * 100)
      : 0

    return {
      ...project,
      progressPercentage,
    }
  })

  return NextResponse.json(projectsWithProgress)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, category, description, totalUnits } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const project = await prisma.learningProject.create({
    data: {
      userId: session.user.id,
      name,
      category: category || 'other',
      description,
      totalUnits,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
