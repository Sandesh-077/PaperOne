import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  try {
    const { topicName, paperCode, completed } = await request.json()
    if (!topicName) return new Response(JSON.stringify({ error: 'Topic name required' }), { status: 400 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })

    const prismaAny = prisma as any
    const task = await prismaAny.dailyTask.findUnique({
      where: { id: params.id }
    })

    if (!task || task.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404 })
    }

    // Update topics array to mark topic as complete
    const topics = (task.topics || []) as Array<{ name: string; paperCode?: string; completed?: boolean }>
    const matchesTopic = (t: { name: string; paperCode?: string; completed?: boolean }) => {
      if (t.name !== topicName) return false
      if (paperCode) return t.paperCode === paperCode
      return true
    }

    const updatedTopics = topics.map(t => ({
      ...t,
      completed: matchesTopic(t) ? completed : t.completed
    }))

    // Track completed topics
    const completedTopics = (task.completedTopics || []) as string[]
    const completionKey = paperCode ? `${paperCode}::${topicName}` : topicName
    const newCompletedTopics = completed 
      ? [...new Set([...completedTopics, completionKey])]
      : completedTopics.filter(t => t !== completionKey)

    const updated = await prismaAny.dailyTask.update({
      where: { id: params.id },
      data: {
        topics: updatedTopics,
        completedTopics: newCompletedTopics,
        completed: updatedTopics.every((t: any) => t.completed)
      }
    })

    return new Response(JSON.stringify({ success: true, task: updated }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Error updating topic:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
