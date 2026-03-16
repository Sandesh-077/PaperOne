import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { callGemini, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

// Pre-defined daily words based on date for consistency
const WORD_BANK = [
  {
    word: "serendipity",
    definition: "The occurrence of events by chance in a happy or beneficial way",
    academicDefinition: "An instance of finding something valuable by chance; fortunate discovery",
    exampleSentence: "The discovery of penicillin was a serendipity that changed medicine forever.",
    synonyms: ["luck", "fortune", "chance", "happenstance"],
    antonyms: ["misfortune", "bad luck"],
    category: "EGP",
    difficulty: 4,
    partOfSpeech: "noun",
    gpTip: "Use this word to show sophisticated vocabulary when discussing coincidental positive outcomes. Examiners appreciate the nuance.",
    commonMistakes: "Don't use it for negative coincidences. Serendipity always implies fortune.",
  },
  {
    word: "cogent",
    definition: "(of an argument or case) clear, logical, and convincing",
    academicDefinition: "Appealing strongly to the mind or reason; compelling and persuasive",
    exampleSentence: "The researcher presented cogent evidence that climate change is human-caused.",
    synonyms: ["compelling", "convincing", "persuasive", "logical"],
    antonyms: ["weak", "unconvincing", "illogical"],
    category: "EGP",
    difficulty: 4,
    partOfSpeech: "adjective",
    gpTip: "Perfect for arguing in essays. 'A cogent argument' is a high-level phrase.",
    commonMistakes: "Don't confuse with 'cognate' (related words) or 'cogitation' (thinking).",
  },
  {
    word: "ubiquitous",
    definition: "Present, appearing, or found everywhere",
    academicDefinition: "Existing or being everywhere at once; constantly encountered",
    exampleSentence: "Smartphones have become ubiquitous in modern society.",
    synonyms: ["omnipresent", "universal", "pervasive", "widespread"],
    antonyms: ["rare", "scarce", "unique"],
    category: "IELTS",
    difficulty: 4,
    partOfSpeech: "adjective",
    gpTip: "Use when discussing technology, social media, or modern phenomena.",
    commonMistakes: "Pronunciation: 'yoo-BIK-wuh-tus'. It doesn't mean 'unique' - it means the opposite!",
  },
  {
    word: "pragmatic",
    definition: "Dealing with things in a realistic way based on actual circumstances rather than theory",
    academicDefinition: "Concerned with practical consequences or facts rather than theory or principles",
    exampleSentence: "We must take a pragmatic approach to climate change, balancing environment and economy.",
    synonyms: ["realistic", "practical", "sensible", "matter-of-fact"],
    antonyms: ["idealistic", "theoretical", "impractical"],
    category: "EGP",
    difficulty: 3,
    partOfSpeech: "adjective",
    gpTip: "Highly valued in GP essays when discussing balanced perspectives.",
    commonMistakes: "It's not just 'practical' - it implies problem-solving with realism.",
  },
  {
    word: "dichotomy",
    definition: "A division or contrast between two things that are represented as being completely opposite",
    academicDefinition: "A division into two contradictory or mutually exclusive parts; a sharp contrast",
    exampleSentence: "There is a dichotomy between what politicians say and what they do.",
    synonyms: ["divide", "split", "contrast", "opposition"],
    antonyms: ["unity", "agreement"],
    category: "EGP",
    difficulty: 5,
    partOfSpeech: "noun",
    gpTip: "Excellent for analyzing opposing viewpoints: 'the dichotomy between X and Y'",
    commonMistakes: "Implies absolute opposition, not just difference.",
  },
  {
    word: "ambiguous",
    definition: "Open to more than one interpretation; unclear or uncertain",
    academicDefinition: "Having more than one possible meaning or interpretation; of doubtful significance",
    exampleSentence: "The minister's statement was ambiguous, leading to different interpretations.",
    synonyms: ["unclear", "vague", "obscure", "equivocal"],
    antonyms: ["clear", "specific", "unambiguous"],
    category: "IELTS",
    difficulty: 3,
    partOfSpeech: "adjective",
    gpTip: "Use to critique unclear arguments: 'The author's position is ambiguous'",
    commonMistakes: "Not just 'confusing' - it specifically means multiple valid interpretations exist.",
  },
  {
    word: "mitigate",
    definition: "To make something less severe, serious, or painful",
    academicDefinition: "To make less severe or serious; to lessen the force or intensity of",
    exampleSentence: "Green spaces in cities mitigate the effects of urban heat.",
    synonyms: ["lessen", "reduce", "alleviate", "ease"],
    antonyms: ["aggravate", "exacerbate", "worsen"],
    category: "EGP",
    difficulty: 3,
    partOfSpeech: "verb",
    gpTip: "Use when discussing solutions: 'We can mitigate climate change through renewable energy'",
    commonMistakes: "Not about 'military' - it's about reducing/lessening harm or severity.",
  },
  {
    word: "ostentatious",
    definition: "Designed to impress or attract notice in a way that is considered tasteless",
    academicDefinition: "Marked by or given to excessive display; showy or pretentious",
    exampleSentence: "The billionaire's ostentatious mansion revealed his lack of good taste.",
    synonyms: ["showy", "flashy", "pretentious", "gaudy"],
    antonyms: ["humble", "modest", "understated"],
    category: "EGP",
    difficulty: 4,
    partOfSpeech: "adjective",
    gpTip: "Perfect for critiquing excessive displays in essays on materialism or wealth.",
    commonMistakes: "Usually has negative connotations; it's about tasteless showing-off.",
  },
  {
    word: "catalyst",
    definition: "A person or thing that precipitates an event or change",
    academicDefinition: "Something that instigates change or action; an agent precipitating an event",
    exampleSentence: "Social media was a catalyst for the Arab Spring protests.",
    synonyms: ["trigger", "spark", "instigator", "agent"],
    antonyms: ["deterrent", "obstacle"],
    category: "EGP",
    difficulty: 3,
    partOfSpeech: "noun",
    gpTip: "Ideal for analyzing causation: 'X served as a catalyst for Y'",
    commonMistakes: "It's not random - a catalyst specifically causes change.",
  },
  {
    word: "ephemeral",
    definition: "Lasting for a very short time; temporary or fleeting",
    academicDefinition: "Transitory; existing or lasting for a short time only",
    exampleSentence: "Social media fame is often ephemeral, lasting mere weeks.",
    synonyms: ["temporary", "transient", "fleeting", "momentary"],
    antonyms: ["permanent", "eternal", "lasting"],
    category: "EGP",
    difficulty: 4,
    partOfSpeech: "adjective",
    gpTip: "Use when discussing temporary trends or phenomena.",
    commonMistakes: "Not just 'short' - it implies something that was beautiful because it was fleeting.",
  },
]

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userId = (session.user as any).id
    
    // Get today's date to ensure consistent daily selection
    const today = new Date().toISOString().split('T')[0]
    const dayHash = Array.from(today).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    // Select 5 random words from the bank based on day hash for consistency
    const shuffled = [...WORD_BANK].sort(() => Math.sin(dayHash) - 0.5)
    const dailyWords = shuffled.slice(0, 5)
    
    // Get user's progress on these words
    const userProgress = await prisma.vocabularyProgress.findMany({
      where: {
        userId: userId,
        word: {
          word: {
            in: dailyWords.map(w => w.word)
          }
        }
      }
    })
    
    const progressMap = new Map(userProgress.map(p => [p.wordId, p]))
    
    // Format response with progress indicator
    const response = {
      date: today,
      words: dailyWords.map(word => ({
        ...word,
        userProgress: {
          status: progressMap.get(word.word)?.status || 'not_started',
          confidenceLevel: progressMap.get(word.word)?.confidenceLevel || 0,
          correctUsageCount: progressMap.get(word.word)?.correctUsageCount || 0,
          incorrectUsageCount: progressMap.get(word.word)?.incorrectUsageCount || 0,
        }
      }))
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching daily words:', error)
    return NextResponse.json({ error: 'Failed to fetch daily words' }, { status: 500 })
  }
}
