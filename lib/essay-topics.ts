// Essay topics database for daily suggestions
export const essayTopics = [
  // Technology
  "Should artificial intelligence be regulated by governments?",
  "Is social media doing more harm than good to society?",
  "Should schools replace textbooks with tablets and laptops?",
  "Are cryptocurrencies the future of money?",
  "Does technology make us more or less social?",
  
  // Education
  "Should university education be free for all?",
  "Is online learning as effective as traditional classroom learning?",
  "Should schools focus more on practical skills than academic knowledge?",
  "Is the current education system preparing students for the future?",
  "Should exams be abolished in favor of continuous assessment?",
  
  // Environment
  "Is climate change the biggest threat facing humanity?",
  "Should plastic be banned globally?",
  "Are electric vehicles the solution to pollution?",
  "Should governments prioritize economic growth over environmental protection?",
  "Is individual action enough to solve environmental problems?",
  
  // Society
  "Should the voting age be lowered to 16?",
  "Is censorship ever justified in a democratic society?",
  "Should wealthy nations do more to help poor countries?",
  "Does money bring happiness?",
  "Is work-life balance achievable in modern society?",
  
  // Health
  "Should junk food advertising be banned?",
  "Is mental health given enough attention in society?",
  "Should vaccinations be mandatory?",
  "Does modern medicine rely too much on pharmaceutical drugs?",
  "Should healthcare be a fundamental human right?",
  
  // Science & Progress
  "Should space exploration be a priority for governments?",
  "Is genetic engineering ethical?",
  "Should animals be used for scientific research?",
  "Does scientific progress always lead to human progress?",
  "Should we fear or embrace artificial intelligence?",
];

// Get two topics for the day (deterministic based on date)
export function getDailyTopics(): [string, string] {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Use day of year to select two topics
  const index1 = dayOfYear % essayTopics.length;
  const index2 = (dayOfYear + Math.floor(essayTopics.length / 2)) % essayTopics.length;
  
  return [essayTopics[index1], essayTopics[index2]];
}

// Check if topic was already used
export function getRandomUnusedTopic(usedTopics: string[]): string {
  const available = essayTopics.filter(topic => !usedTopics.includes(topic));
  if (available.length === 0) {
    // All topics used, return a random one
    return essayTopics[Math.floor(Math.random() * essayTopics.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
