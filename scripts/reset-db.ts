import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Starting database reset...')
  
  try {
    // Delete in reverse order of dependencies
    console.log('Deleting PracticePaperQuestions...')
    await prisma.practicePaperQuestion.deleteMany({})
    
    console.log('Deleting PracticePaperLogs...')
    await prisma.practicePaperLog.deleteMany({})
    
    console.log('Deleting PracticePapers...')
    await prisma.practicePaper.deleteMany({})
    
    console.log('Deleting Exams...')
    await prisma.exam.deleteMany({})
    
    console.log('Deleting Notes...')
    await prisma.note.deleteMany({})
    
    console.log('Deleting Revisions...')
    await prisma.revision.deleteMany({})
    
    console.log('Deleting Subtopics...')
    await prisma.subtopic.deleteMany({})
    
    console.log('Deleting Topics...')
    await prisma.topic.deleteMany({})
    
    console.log('Deleting Subjects...')
    await prisma.subject.deleteMany({})
    
    console.log('Deleting SATSessions...')
    await prisma.sATSession.deleteMany({})
    
    console.log('Deleting StudySessions...')
    await prisma.studySession.deleteMany({})
    
    console.log('Deleting LearningSessions...')
    await prisma.learningSession.deleteMany({})
    
    console.log('Deleting VocabularyItems...')
    await prisma.vocabularyItem.deleteMany({})
    
    console.log('Deleting GrammarItems...')
    await prisma.grammarItem.deleteMany({})
    
    console.log('Deleting Essays...')
    await prisma.essay.deleteMany({})
    
    console.log('Deleting Errors...')
    await prisma.error.deleteMany({})
    
    console.log('Deleting Accounts...')
    await prisma.account.deleteMany({})
    
    console.log('Deleting Sessions...')
    await prisma.session.deleteMany({})
    
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
