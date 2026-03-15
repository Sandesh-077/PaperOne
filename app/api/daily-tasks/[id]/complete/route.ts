import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // STEP 2: Parse request body
    const body = await req.json()
    const { completed, studySessionId } = body

    // STEP 3: Find DailyTask by id AND userId
    const prismaAny = prisma as any
    const task = await prismaAny.dailyTask.findUnique({
      where: { id: params.id }
    })

    if (!task) {
      return NextResponse.json({ error: 'Daily task not found' }, { status: 404 })
    }

    // Verify ownership
    if (task.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // STEP 4: Update the DailyTask
    const updateData: any = {
      completed
    }

    if (completed === true) {
      updateData.completedAt = new Date()
    } else if (completed === false) {
      updateData.completedAt = null
    }

    if (studySessionId !== undefined) {
      updateData.studySessionId = studySessionId
    }

    const updatedTask = await prismaAny.dailyTask.update({
      where: { id: params.id },
      data: updateData
    })

    // STEP 5: Return updated task
    return NextResponse.json({ task: updatedTask })
  } catch (error) {
    console.error('Error updating daily task:', error)
    return NextResponse.json(
      { error: 'Failed to update daily task' },
      { status: 500 }
    )
  }
}
