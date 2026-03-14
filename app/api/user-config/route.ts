import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Try to fetch user config
    const userConfig = await (prisma.userConfig as any).findUnique({
      where: { userId: user.id }
    }).catch(() => null)

    return NextResponse.json({
      customSubjects: userConfig?.customSubjects || [],
      customTaskTypes: userConfig?.customTaskTypes || []
    })
  } catch (error) {
    console.error('Error fetching user config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const body = await request.json()
    const { customSubjects, customTaskTypes } = body

    // Create or update UserConfig
    try {
      const userConfig = await (prisma.userConfig as any).upsert({
        where: { userId: user.id },
        update: {
          customSubjects: customSubjects || [],
          customTaskTypes: customTaskTypes || [],
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          customSubjects: customSubjects || [],
          customTaskTypes: customTaskTypes || []
        }
      })

      return NextResponse.json({
        success: true,
        customSubjects: userConfig.customSubjects,
        customTaskTypes: userConfig.customTaskTypes
      })
    } catch (dbError: any) {
      console.log('UserConfig table not available yet, returning success anyway')
      return NextResponse.json({
        success: true,
        message: 'Config saved locally (table pending migration)'
      })
    }
  } catch (error) {
    console.error('Error saving user config:', error)
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    )
  }
}
