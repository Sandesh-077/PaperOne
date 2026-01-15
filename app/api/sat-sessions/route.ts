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

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const satSessions = await prisma.sATSession.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(satSessions)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { topic, source, youtubeUrl, timestamp, duration, notes, completed } = await request.json()

  if (!topic) {
    return NextResponse.json(
      { error: 'Topic is required' },
      { status: 400 }
    )
  }

  let videoId = null
  if (youtubeUrl && source === 'youtube') {
    videoId = extractYouTubeId(youtubeUrl)
  }

  const satSession = await prisma.sATSession.create({
    data: {
      userId: session.user.id,
      topic,
      source: source || 'other',
      youtubeUrl,
      videoId,
      timestamp: timestamp ?? 0,
      duration,
      notes,
      completed: completed ?? false,
    },
  })

  return NextResponse.json(satSession, { status: 201 })
}
