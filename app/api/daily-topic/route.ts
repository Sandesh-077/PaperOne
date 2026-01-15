import { NextResponse } from 'next/server'
import { getDailyTopic, getRandomTopic } from '@/lib/topics'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'daily'

  if (type === 'random') {
    const topic = getRandomTopic()
    return NextResponse.json(topic)
  }

  const topic = getDailyTopic()
  return NextResponse.json(topic)
}
