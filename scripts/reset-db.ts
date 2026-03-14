import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Starting database reset...')
  
  try {
    const prismaAny = prisma as any
    
    // Delete in reverse order of dependencies (models that exist in current schema)
    console.log('Deleting MistakeLogs...')
    try {
      await prismaAny.mistakeLog.deleteMany({})
    } catch (err) {
      console.log('⚠️  MistakeLog not available')
    }
    
    console.log('Deleting WeeklyPerformance...')
    try {
      await prismaAny.weeklyPerformance.deleteMany({})
    } catch (err) {
      console.log('⚠️  WeeklyPerformance not available')
    }
    
    console.log('Deleting MonthSummary...')
    try {
      await prismaAny.monthSummary.deleteMany({})
    } catch (err) {
      console.log('⚠️  MonthSummary not available')
    }
    
    console.log('Deleting TopicMastery...')
    try {
      await prismaAny.topicMastery.deleteMany({})
    } catch (err) {
      console.log('⚠️  TopicMastery not available')
    }
    
    console.log('Deleting StudySessions...')
    await prisma.studySession.deleteMany({})
    
    console.log('Deleting Notes...')
    await prisma.note.deleteMany({})
    
    console.log('Deleting Subtopics...')
    await prisma.subtopic.deleteMany({})
    
    console.log('Deleting Topics...')
    await prisma.topic.deleteMany({})
    
    console.log('Deleting Subjects...')
    await prisma.subject.deleteMany({})
    
    console.log('Deleting Errors...')
    await prisma.error.deleteMany({})
    
    console.log('Deleting Users...')
    await prisma.user.deleteMany({})
    
    console.log('✅ Database reset complete! All data deleted.')
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

