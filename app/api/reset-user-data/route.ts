import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    console.log('🗑️  Starting user data reset...')
    
    // Delete all user-related data in reverse order of dependencies
    await prisma.practicePaperQuestion.deleteMany({
      where: {
        practicePaper: {
          subject: {
            userId
          }
        }
      }
    })
    
    await prisma.practicePaperLog.deleteMany({
      where: {
        practicePaper: {
          subject: {
            userId
          }
        }
      }
    })
    
    await prisma.practicePaper.deleteMany({
      where: {
        subject: {
          userId
        }
      }
    })
    
    await prisma.exam.deleteMany({
      where: {
        subject: {
          userId
        }
      }
    })
    
    await prisma.note.deleteMany({
      where: {
        subject: {
          userId
        }
      }
    })
    
    // Delete all revisions for topics belonging to this user
    await prisma.revision.deleteMany({
      where: {
        topic: {
          subject: {
            userId
          }
        }
      }
    })
    
    await prisma.subtopic.deleteMany({
      where: {
        topic: {
          subject: {
            userId
          }
        }
      }
    })
    
    await prisma.topic.deleteMany({
      where: {
        subject: {
          userId
        }
      }
    })
    
    await prisma.subject.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.sATSession.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.studySession.deleteMany({
      where: {
        userId
      }
    })
    
    // If LearningSession has a userId, use it. Otherwise, skip or adjust as needed.
    // await prisma.learningSession.deleteMany({ where: { userId } })
    
    await prisma.vocabulary.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.grammarRule.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.essay.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.error.deleteMany({
      where: {
        userId
      }
    })
    
    console.log('✅ User data reset complete!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'All your data has been deleted successfully. You can start fresh!' 
    })
  } catch (error) {
    console.error('❌ Error resetting user data:', error)
    return NextResponse.json(
      { error: 'Failed to reset data' },
      { status: 500 }
    )
  }
}
