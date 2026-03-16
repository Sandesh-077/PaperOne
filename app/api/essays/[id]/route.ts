import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  try {
    const essay = await prisma.essay.findFirst({
      where: { id: params.id, userId: user.id }
    })
    
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})
    
    // Calculate word count
    const wordCount = essay.content.trim().split(/\s+/).filter(w => w.length > 0).length
    
    return NextResponse.json({
      ...essay,
      wordCount,
      prompt: essay.topic // Map topic back to prompt for frontend compatibility
    })
  } catch (error) {
    console.error('Error fetching essay:', error)
    return NextResponse.json({error: 'Failed to fetch essay'}, {status: 500})
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const data = await req.json()

  try {
    // Verify user owns this essay
    const essay = await prisma.essay.findFirst({
      where: { id: params.id, userId: user.id }
    })
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.topic !== undefined) updateData.topic = data.topic
    if (data.prompt !== undefined) updateData.topic = data.prompt // Map prompt to topic
    if (data.content !== undefined) updateData.content = data.content
    if (data.essayType !== undefined) updateData.essayType = data.essayType

    const updated = await prisma.essay.update({
      where: { id: params.id },
      data: updateData
    })

    const wordCount = updated.content.trim().split(/\s+/).filter(w => w.length > 0).length

    return NextResponse.json({
      ...updated,
      wordCount,
      prompt: updated.topic
    })
  } catch (error) {
    console.error('Error updating essay:', error)
    return NextResponse.json({error: 'Failed to update essay'}, {status: 500})
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  try {
    // Verify user owns this essay
    const essay = await prisma.essay.findFirst({
      where: { id: params.id, userId: user.id }
    })
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

    await prisma.essay.delete({
      where: { id: params.id }
    })

    return NextResponse.json({success: true})
  } catch (error) {
    console.error('Error deleting essay:', error)
    return NextResponse.json({error: 'Failed to delete essay'}, {status: 500})
  }
}
