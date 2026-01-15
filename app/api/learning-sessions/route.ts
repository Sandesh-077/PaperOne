import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, unitsCompleted, unitCovered, duration, progress, notes } = await request.json()

  if (!projectId || !unitsCompleted) {
    return NextResponse.json({ error: 'Project ID and units completed are required' }, { status: 400 })
  }

  // Verify project belongs to user
  const project = await prisma.learningProject.findUnique({
    where: { id: projectId },
  })

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Create learning session
  const learningSession = await prisma.learningSession.create({
    data: {
      projectId,
      unitsCompleted: parseInt(unitsCompleted),
      unitCovered,
      duration,
      progress,
      notes,
    },
  })

  // Calculate days since last session
  const today = new Date()
  const lastStudied = project.lastStudied ? new Date(project.lastStudied) : new Date(project.createdAt)
  const daysDiff = Math.floor((today.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24))
  
  // Update project: increment daysSpent if different day and increment completedUnits
  const daysSpentIncrement = daysDiff > 0 ? 1 : 0
  const newCompletedUnits = project.completedUnits + parseInt(unitsCompleted)

  await prisma.learningProject.update({
    where: { id: projectId },
    data: {
      lastStudied: today,
      daysSpent: project.daysSpent + daysSpentIncrement,
      completedUnits: newCompletedUnits,
      status: project.totalUnits && newCompletedUnits >= project.totalUnits ? 'completed' : 'in_progress',
    },
  })

  return NextResponse.json(learningSession, { status: 201 })
}
