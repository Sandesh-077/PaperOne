import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      // Get single essay
      const essay = await prisma.essay.findFirst({
        where: { id, userId: user.id }
      })
      if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})
      
      // Calculate word count
      const wordCount = essay.content.trim().split(/\s+/).filter(w => w.length > 0).length
      
      return NextResponse.json({
        ...essay,
        wordCount
      })
    } else {
      // Get all essays
      const essays = await prisma.essay.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })

      // Add word count to each essay
      const essaysWithWordCount = essays.map(essay => ({
        ...essay,
        wordCount: essay.content.trim().split(/\s+/).filter(w => w.length > 0).length
      }))

      return NextResponse.json(essaysWithWordCount)
    }
  } catch (error) {
    console.error('Error fetching essays:', error)
    return NextResponse.json({error: 'Failed to fetch essays'}, {status: 500})
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const data = await req.json()

  try {
    const essay = await prisma.essay.create({
      data: {
        userId: user.id,
        title: data.title || 'Untitled',
        topic: data.topic || null,
        content: data.content || '',
        essayType: data.essayType || 'full'
      }
    })

    // Calculate word count
    const wordCount = essay.content.trim().split(/\s+/).filter(w => w.length > 0).length

    return NextResponse.json({
      ...essay,
      wordCount
    })
  } catch (error) {
    console.error('Error creating essay:', error)
    return NextResponse.json({error: 'Failed to create essay'}, {status: 500})
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) {
    // Check if id is in the body
    const bodyData = await req.json()
    if (!bodyData.id) {
      return NextResponse.json({error: 'Essay ID required'}, {status: 400})
    }
    
    try {
      // Verify user owns this essay
      const essay = await prisma.essay.findFirst({
        where: { id: bodyData.id, userId: user.id }
      })
      if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

      const updateData: any = {}
      if (bodyData.title !== undefined) updateData.title = bodyData.title
      if (bodyData.topic !== undefined) updateData.topic = bodyData.topic
      if (bodyData.prompt !== undefined) updateData.topic = bodyData.prompt // Map prompt to topic
      if (bodyData.content !== undefined) updateData.content = bodyData.content
      if (bodyData.essayType !== undefined) updateData.essayType = bodyData.essayType

      const updated = await prisma.essay.update({
        where: { id: bodyData.id },
        data: updateData
      })

      const wordCount = updated.content.trim().split(/\s+/).filter(w => w.length > 0).length

      return NextResponse.json({
        ...updated,
        wordCount
      })
    } catch (error) {
      console.error('Error updating essay:', error)
      return NextResponse.json({error: 'Failed to update essay'}, {status: 500})
    }
  }

  const data = await req.json()

  try {
    // Verify user owns this essay
    const essay = await prisma.essay.findFirst({
      where: { id, userId: user.id }
    })
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.topic !== undefined) updateData.topic = data.topic
    if (data.prompt !== undefined) updateData.topic = data.prompt // Map prompt to topic
    if (data.content !== undefined) updateData.content = data.content
    if (data.essayType !== undefined) updateData.essayType = data.essayType

    const updated = await prisma.essay.update({
      where: { id },
      data: updateData
    })

    const wordCount = updated.content.trim().split(/\s+/).filter(w => w.length > 0).length

    return NextResponse.json({
      ...updated,
      wordCount
    })
  } catch (error) {
    console.error('Error updating essay:', error)
    return NextResponse.json({error: 'Failed to update essay'}, {status: 500})
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({error: 'Essay ID required'}, {status: 400})
  }

  try {
    // Verify user owns this essay
    const essay = await prisma.essay.findFirst({
      where: { id, userId: user.id }
    })
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

    await prisma.essay.delete({
      where: { id }
    })

    return NextResponse.json({success: true})
  } catch (error) {
    console.error('Error deleting essay:', error)
    return NextResponse.json({error: 'Failed to delete essay'}, {status: 500})
  }
}
