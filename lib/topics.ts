// GP-style essay topics organized by category
const GP_TOPICS = {
  education: [
    "Should universities prioritize practical skills over theoretical knowledge?",
    "Are standardized tests an accurate measure of student ability?",
    "Is homeschooling a viable alternative to traditional education?",
    "Should education be free at all levels?",
    "Do schools place too much emphasis on academic achievement?",
    "Is online learning as effective as traditional classroom education?",
    "Should students be taught financial literacy in school?",
    "Are traditional teaching methods outdated in the digital age?",
  ],
  technology: [
    "Has social media done more harm than good?",
    "Should artificial intelligence development be regulated?",
    "Is privacy dead in the digital age?",
    "Do smartphones make us less intelligent?",
    "Should governments have access to encrypted communications?",
    "Is technology making us more isolated?",
    "Will automation lead to mass unemployment?",
    "Should children be given smartphones at a young age?",
  ],
  society: [
    "Is economic inequality inevitable in capitalist societies?",
    "Should voting be made compulsory?",
    "Is celebrity culture harmful to society?",
    "Do we have a moral obligation to help refugees?",
    "Should governments implement a universal basic income?",
    "Is modern society too materialistic?",
    "Are young people today more self-centered than previous generations?",
    "Should the death penalty be abolished worldwide?",
  ],
  environment: [
    "Is individual action enough to combat climate change?",
    "Should environmental protection be prioritized over economic growth?",
    "Are plastic bans effective in reducing pollution?",
    "Should governments tax carbon emissions?",
    "Is nuclear energy the solution to our energy crisis?",
    "Do developed countries bear more responsibility for climate change?",
    "Should animal testing be banned?",
    "Is veganism the answer to environmental problems?",
  ],
  media: [
    "Should fake news be criminalized?",
    "Is traditional journalism dying?",
    "Do we have too much freedom of speech online?",
    "Should celebrities be held to higher moral standards?",
    "Is cancel culture justified?",
    "Should governments regulate social media platforms?",
    "Has the internet made us better informed or more confused?",
    "Should there be age restrictions on social media?",
  ],
}

const CATEGORIES = Object.keys(GP_TOPICS) as Array<keyof typeof GP_TOPICS>

/**
 * Generate a daily GP topic based on the current date
 * Uses date as seed for consistent daily topics
 */
export function getDailyTopic(): { category: string; prompt: string } {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )

  // Use day of year to select category and topic consistently
  const categoryIndex = dayOfYear % CATEGORIES.length
  const category = CATEGORIES[categoryIndex]
  const topics = GP_TOPICS[category]
  const topicIndex = Math.floor(dayOfYear / CATEGORIES.length) % topics.length

  return {
    category,
    prompt: topics[topicIndex],
  }
}

/**
 * Get a random topic from a specific category
 */
export function getTopicByCategory(category: keyof typeof GP_TOPICS): string {
  const topics = GP_TOPICS[category]
  return topics[Math.floor(Math.random() * topics.length)]
}

/**
 * Get all topics for a category
 */
export function getAllTopics(category: keyof typeof GP_TOPICS): string[] {
  return GP_TOPICS[category]
}

/**
 * Get a completely random topic
 */
export function getRandomTopic(): { category: string; prompt: string } {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
  const topics = GP_TOPICS[category]
  const prompt = topics[Math.floor(Math.random() * topics.length)]
  
  return { category, prompt }
}
