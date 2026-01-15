import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const satSession = await prisma.sATSession.findUnique({
    where: { id: params.id },
  })

  if (!satSession || satSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(satSession)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const satSession = await prisma.sATSession.findUnique({
    where: { id: params.id },
  })

  if (!satSession || satSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await request.json()
  
  // If YouTube URL changed, extract new video ID
  if (data.youtubeUrl && data.youtubeUrl !== satSession.youtubeUrl) {
    data.videoId = extractYouTubeId(data.youtubeUrl)
  }

  const updatedSatSession = await prisma.sATSession.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(updatedSatSession)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const satSession = await prisma.sATSession.findUnique({
    where: { id: params.id },
  })

  if (!satSession || satSession.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.sATSession.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
