// GP-style essay topics organized by category
// Technology topics weighted higher (60%) for better learning opportunities
const GP_TOPICS = {
  // 60% of topics are technology-related
  technology: [
    "How is artificial intelligence transforming healthcare, and what ethical concerns arise from AI-powered medical diagnoses?",
    "Should social media platforms be held legally responsible for the content shared by their users? Examine the implications for free speech and platform liability.",
    "Evaluate the impact of blockchain technology beyond cryptocurrency. How might it revolutionize supply chain management, voting systems, or digital identity?",
    "Is the development of autonomous vehicles worth the ethical dilemmas they present? Discuss the trolley problem in the context of self-driving cars.",
    "How has cloud computing changed the way businesses operate? Analyze the benefits and security risks of storing data in the cloud.",
    "Should governments implement stricter regulations on data privacy? Examine the GDPR and similar legislation's effectiveness.",
    "Explore how quantum computing could transform cryptography, drug discovery, and climate modeling. What are the current limitations?",
    "Is remote work technology creating a better work-life balance or blurring the boundaries? Analyze the long-term societal impacts.",
    "How is machine learning being used to combat climate change? Discuss applications in renewable energy optimization and climate modeling.",
    "Should biotechnology companies be allowed to patent genetic modifications? Examine the implications for healthcare accessibility and innovation.",
    "Evaluate the role of technology in education. Are digital learning platforms democratizing knowledge or creating new inequalities?",
    "How do recommendation algorithms shape our media consumption and worldview? Discuss the implications for democracy and social cohesion.",
    "Is facial recognition technology a tool for security or a threat to civil liberties? Analyze its use in law enforcement and public spaces.",
    "Explore how 5G networks will enable the Internet of Things (IoT). What opportunities and vulnerabilities does this create?",
    "Should tech companies be broken up to prevent monopolistic practices? Examine the debate around Big Tech regulation.",
    "How is cybersecurity evolving to address emerging threats? Discuss the role of AI in both cyber attacks and defense.",
    "Evaluate the environmental impact of technology. Are data centers and cryptocurrency mining sustainable?",
    "Should artificial general intelligence (AGI) development be halted until we solve the alignment problem? Discuss existential risks.",
    "How is technology changing healthcare accessibility in developing countries? Examine telemedicine and mobile health applications.",
    "Is the metaverse the future of social interaction, or a distraction from real-world problems? Analyze its potential impact on society.",
    "Explore the ethics of gene editing technologies like CRISPR. Should we edit human embryos to prevent genetic diseases?",
    "How do deepfakes threaten information integrity? Discuss technological and policy solutions to combat synthetic media.",
    "Should space exploration be privatized? Evaluate the role of companies like SpaceX in advancing humanity's presence beyond Earth.",
    "How is technology addressing food security? Examine vertical farming, lab-grown meat, and precision agriculture.",
  ],
  // 20% society & policy
  society: [
    "Is universal basic income a solution to automation-driven unemployment? Examine pilot programs and economic feasibility.",
    "Should voting be made compulsory in democratic societies? Analyze the impact on civic engagement and representation.",
    "How do social credit systems like China's affect individual freedom and behavior? Discuss the balance between social order and privacy.",
    "Is economic inequality a necessary byproduct of capitalism, or can it be reduced without sacrificing economic growth?",
    "Should governments tax robots or automation to fund social programs? Explore the economic and practical implications.",
    "How has globalization affected cultural identity and diversity? Discuss both homogenization and cultural exchange.",
    "Is the gig economy empowering workers or creating a new form of exploitation? Examine labor rights in the digital age.",
  ],
  // 10% environment & sustainability
  environment: [
    "Can technology solve climate change, or do we need fundamental changes in consumption patterns? Discuss carbon capture, renewable energy, and behavioral change.",
    "Should nuclear energy be part of the renewable energy transition? Evaluate safety concerns versus climate benefits.",
    "How effective are carbon taxes and cap-and-trade systems? Compare different policy approaches to reducing emissions.",
    "Is sustainable development possible, or does economic growth inevitably harm the environment? Examine circular economy models.",
  ],
  // 10% education & knowledge
  education: [
    "Should education systems prioritize STEM subjects over humanities? Discuss the value of different types of knowledge in the modern economy.",
    "How has the internet changed the nature of expertise and authority? Examine the democratization of knowledge versus misinformation.",
    "Is the traditional university model becoming obsolete? Evaluate online degrees, MOOCs, and alternative credentialing.",
    "Should programming be taught as a core subject in schools? Discuss digital literacy in the 21st century.",
  ],
}

const CATEGORIES = Object.keys(GP_TOPICS) as Array<keyof typeof GP_TOPICS>

/**
 * Generate a daily GP topic based on the current date
 * Uses date as seed for consistent daily topics
 * Weighted to show technology topics 60% of the time
 */
export function getDailyTopic(): { category: string; prompt: string } {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  )

  // Weight technology topics: 60% tech, 40% other categories
  let category: keyof typeof GP_TOPICS
  
  if (dayOfYear % 10 < 6) {
    // 60% chance: always show technology
    category = 'technology'
  } else {
    // 40% chance: rotate through other categories
    const otherCategories = CATEGORIES.filter(cat => cat !== 'technology')
    const otherIndex = Math.floor(dayOfYear / 10) % otherCategories.length
    category = otherCategories[otherIndex]
  }
  
  const topics = GP_TOPICS[category]
  const topicIndex = dayOfYear % topics.length

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
