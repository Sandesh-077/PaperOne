'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface EnglishProfile {
  grammarLevel: number
  vocabLevel: number
  writingLevel: number
  overallScore: number
  streak: number
  lastActiveDate: string | null
}

interface GrammarRule {
  name: string
  explanation: string
  example1: string
  example2: string
  commonMistake: string
  tip: string
}

interface VocabWord {
  word: string
  partOfSpeech: string
  definition: string
  academicExample: string
  synonyms: string[]
  gpTip: string
  difficulty: number
}

interface Lesson {
  grammarRule: GrammarRule
  vocabWords: VocabWord[]
  todayTopic: string
  practicePrompt: string
}

interface FeedbackData {
  grammarAnalysis: {
    usedTargetRule: boolean
    grammarErrors: Array<{ original: string; corrected: string; explanation: string }>
    grammarScore: number
    grammarComment: string
  }
  vocabAnalysis: {
    targetWordsUsed: string[]
    vocabScore: number
    betterAlternatives: Array<{ used: string; suggested: string }>
    vocabComment: string
  }
  argumentAnalysis: {
    hasPoint: boolean
    hasEvidence: boolean
    hasEvaluation: boolean
    argumentScore: number
    argumentComment: string
  }
  correctedVersion: string
  overallFeedback: string
  levelChanges: {
    grammarDelta: number
    vocabDelta: number
    encouragement: string
  }
}

export default function EnglishTrainerPage() {
  const router = useRouter()
  const { status } = useSession()
  const [profile, setProfile] = useState<EnglishProfile | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'learn' | 'practice'>('learn')
  const [generatingLesson, setGeneratingLesson] = useState(false)
  const [grammarMarked, setGrammarMarked] = useState(false)
  const [vocabMarked, setVocabMarked] = useState<boolean[]>([false, false, false])
  const [practiceResponse, setPracticeResponse] = useState('')
  const [checkingPractice, setCheckingPractice] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [updatedProfile, setUpdatedProfile] = useState<EnglishProfile | null>(null)
  const [trainerSessionId, setTrainerSessionId] = useState<string | null>(null)
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null)

  const loadTodaysLesson = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const stored = localStorage.getItem(`lesson_${today}`)
    if (stored) {
      const data = JSON.parse(stored)
      setLesson(data.lesson)
      setTrainerSessionId(data.trainerSessionId)
    }
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/english-trainer/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        loadTodaysLesson()
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }, [loadTodaysLesson])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router, fetchProfile])

  const startLesson = async () => {
    setGeneratingLesson(true)
    try {
      const response = await fetch('/api/english-trainer/daily-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        setLesson(data.lesson)
        setProfile(data.profile)

        // Store in localStorage for today
        const today = new Date().toISOString().split('T')[0]
        localStorage.setItem(`lesson_${today}`, JSON.stringify({
          lesson: data.lesson,
          trainerSessionId: data.trainerSessionId
        }))

        // Create a trainer session for this lesson
        setTrainerSessionId(data.trainerSessionId || null)
      }
    } catch (error) {
      console.error('Failed to generate lesson:', error)
    } finally {
      setGeneratingLesson(false)
    }
  }

  const toggleVocabMarked = (index: number) => {
    const newMarked = [...vocabMarked]
    newMarked[index] = !newMarked[index]
    setVocabMarked(newMarked)
  }

  const allVocabMarked = vocabMarked.every(m => m)

  const submitPractice = async () => {
    if (!lesson || !practiceResponse) return

    setCheckingPractice(true)
    try {
      const response = await fetch('/api/english-trainer/check-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: practiceResponse,
          questionAsked: lesson.practicePrompt,
          grammarRule: lesson.grammarRule.name,
          vocabWords: lesson.vocabWords.map(w => w.word),
          trainerSessionId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
        setUpdatedProfile(data.updatedProfile)

        // Show level up message if applicable
        if (data.feedback.levelChanges?.grammarDelta > 0) {
          setLevelUpMessage(`🎉 Grammar level up! Now ${data.updatedProfile.grammarLevel}/10`)
        } else if (data.feedback.levelChanges?.vocabDelta > 0) {
          setLevelUpMessage(`🎉 Vocab level up! Now ${data.updatedProfile.vocabLevel}/10`)
        } else {
          setLevelUpMessage(`✓ Keep practicing! ${data.feedback.levelChanges?.encouragement}`)
        }
      }
    } catch (error) {
      console.error('Failed to check practice:', error)
    } finally {
      setCheckingPractice(false)
    }
  }

  const tryAnotherQuestion = async () => {
    setFeedback(null)
    setPracticeResponse('')
    setLevelUpMessage(null)
    startLesson()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your English profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-4xl font-bold text-gray-900">English Trainer</h1>
            <div className="flex items-center gap-2">
              {profile?.streak && profile.streak > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  <span className="text-lg">🔥 {profile.streak} day streak</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Grammar L{profile?.grammarLevel}/10
            </div>
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              Vocab L{profile?.vocabLevel}/10
            </div>
            <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
              Writing L{profile?.writingLevel}/5
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('learn')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'learn'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Learn
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              activeTab === 'practice'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Practice
          </button>
        </div>

        {/* LEARN TAB */}
        {activeTab === 'learn' && (
          <div className="space-y-6">
            {!lesson ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="mb-4">
                  <div className="text-5xl mb-4">📚</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to learn today?</h2>
                  <p className="text-gray-600 mb-6">Start your personalized grammar and vocabulary lesson</p>
                </div>
                <button
                  onClick={startLesson}
                  disabled={generatingLesson}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {generatingLesson ? 'Preparing your lesson...' : 'Start today\'s lesson'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grammar Card */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Today's Grammar Rule</h2>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {lesson.todayTopic}
                    </span>
                  </div>

                  <h3 className="text-3xl font-bold text-blue-600 mb-4">{lesson.grammarRule.name}</h3>
                  <p className="text-gray-700 mb-6 leading-relaxed">{lesson.grammarRule.explanation}</p>

                  {/* Examples */}
                  <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="text-sm font-semibold text-gray-600 mb-3">Examples:</p>
                    <p className="text-gray-700 mb-3">• {lesson.grammarRule.example1}</p>
                    <p className="text-gray-700">• {lesson.grammarRule.example2}</p>
                  </div>

                  {/* Common Mistake */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Common Mistake:</p>
                    <p className="text-gray-700">{lesson.grammarRule.commonMistake}</p>
                  </div>

                  {/* Tip */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-green-800 mb-1">💡 Tip:</p>
                    <p className="text-gray-700">{lesson.grammarRule.tip}</p>
                  </div>

                  <button
                    onClick={() => setGrammarMarked(!grammarMarked)}
                    className={`${
                      grammarMarked
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } px-4 py-2 rounded-lg font-semibold transition-colors`}
                  >
                    {grammarMarked ? '✓ Got it' : 'Got it ✓'}
                  </button>
                </div>

                {/* Vocab Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {lesson.vocabWords.map((word, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">{word.word}</h3>
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                          {word.partOfSpeech}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{word.definition}</p>
                      <p className="text-sm text-gray-700 mb-4 italic">"{word.academicExample}"</p>

                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Synonyms:</p>
                        <div className="flex flex-wrap gap-2">
                          {word.synonyms.map((syn, i) => (
                            <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-green-700 mb-4 italic">💡 {word.gpTip}</p>

                      <button
                        onClick={() => toggleVocabMarked(index)}
                        className={`w-full ${
                          vocabMarked[index]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } px-4 py-2 rounded-lg font-semibold transition-colors`}
                      >
                        {vocabMarked[index] ? '✓ Got it' : 'Got it ✓'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Ready to Practice */}
                {grammarMarked && allVocabMarked && (
                  <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6 text-center">
                    <p className="text-green-800 font-semibold mb-4">✓ All vocab learned! Ready to practice?</p>
                    <button
                      onClick={() => setActiveTab('practice')}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                    >
                      Start Practice →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PRACTICE TAB */}
        {activeTab === 'practice' && (
          <div className="space-y-6">
            {!lesson ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600 mb-4">No lesson loaded. Start the lesson first!</p>
                <button
                  onClick={() => {
                    setActiveTab('learn')
                    startLesson()
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Go to Learn
                </button>
              </div>
            ) : !feedback ? (
              <div className="space-y-6">
                {/* Question Card */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Practice Question</h2>
                  <p className="text-lg text-gray-700 mb-4">{lesson.practicePrompt}</p>
                </div>

                {/* Reminder */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">💡 Reminder:</span> Try to use the <span className="font-semibold">{lesson.grammarRule.name}</span> rule and these words: <span className="font-semibold">{lesson.vocabWords.map(w => w.word).join(', ')}</span>
                  </p>
                </div>

                {/* Text Area */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Your Response (min 3 sentences)
                  </label>
                  <textarea
                    value={practiceResponse}
                    onChange={(e) => setPracticeResponse(e.target.value)}
                    placeholder="Write your response here..."
                    className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">{practiceResponse.length} characters</p>
                    <button
                      onClick={submitPractice}
                      disabled={checkingPractice || !practiceResponse}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {checkingPractice ? 'Checking your response...' : 'Submit for Feedback'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Level Up Message */}
                {levelUpMessage && (
                  <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow-sm p-6 text-center">
                    <p className="text-lg font-bold">{levelUpMessage}</p>
                  </div>
                )}

                {/* Grammar Feedback */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Grammar Feedback</h3>
                    {feedback.grammarAnalysis.usedTargetRule ? (
                      <span className="text-2xl">✅</span>
                    ) : (
                      <span className="text-2xl">❌</span>
                    )}
                  </div>

                  {feedback.grammarAnalysis.grammarErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-red-900 mb-3">Corrections:</p>
                      {feedback.grammarAnalysis.grammarErrors.map((error, i) => (
                        <div key={i} className="mb-3 text-sm">
                          <p className="text-gray-700 mb-1">
                            <span className="line-through text-red-600">{error.original}</span>
                            {' → '}
                            <span className="text-green-600 font-semibold">{error.corrected}</span>
                          </p>
                          <p className="text-gray-600 text-xs">{error.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                      {feedback.grammarAnalysis.grammarScore}/10
                    </span>
                  </div>
                  <p className="text-gray-700">{feedback.grammarAnalysis.grammarComment}</p>
                </div>

                {/* Vocab Feedback */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Vocabulary Feedback</h3>

                  {feedback.vocabAnalysis.targetWordsUsed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Words you used:</p>
                      <div className="flex flex-wrap gap-2">
                        {feedback.vocabAnalysis.targetWordsUsed.map((word, i) => (
                          <span key={i} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            ✓ {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {feedback.vocabAnalysis.betterAlternatives.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-yellow-900 mb-3">Better alternatives:</p>
                      {feedback.vocabAnalysis.betterAlternatives.map((alt, i) => (
                        <div key={i} className="text-sm mb-2">
                          <p className="text-gray-700">
                            <span className="line-through text-gray-600">{alt.used}</span>
                            {' → '}
                            <span className="text-blue-600 font-semibold">{alt.suggested}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                      {feedback.vocabAnalysis.vocabScore}/10
                    </span>
                  </div>
                  <p className="text-gray-700">{feedback.vocabAnalysis.vocabComment}</p>
                </div>

                {/* Argument Feedback */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Argument Analysis</h3>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      {feedback.argumentAnalysis.hasPoint ? (
                        <span className="text-2xl">✅</span>
                      ) : (
                        <span className="text-2xl">❌</span>
                      )}
                      <span className="text-gray-700">Has a clear point</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {feedback.argumentAnalysis.hasEvidence ? (
                        <span className="text-2xl">✅</span>
                      ) : (
                        <span className="text-2xl">❌</span>
                      )}
                      <span className="text-gray-700">Has supporting evidence</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {feedback.argumentAnalysis.hasEvaluation ? (
                        <span className="text-2xl">✅</span>
                      ) : (
                        <span className="text-2xl">❌</span>
                      )}
                      <span className="text-gray-700">Has evaluation</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">
                      {feedback.argumentAnalysis.argumentScore}/10
                    </span>
                  </div>
                  <p className="text-gray-700">{feedback.argumentAnalysis.argumentComment}</p>
                </div>

                {/* Corrected Version */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Corrected Version</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{feedback.correctedVersion}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(feedback.correctedVersion)
                      alert('Copied to clipboard!')
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
                  >
                    Copy
                  </button>
                </div>

                {/* Overall Feedback */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">Overall Feedback</h3>
                  <p className="text-gray-700">{feedback.overallFeedback}</p>
                </div>

                {/* Try Another */}
                <button
                  onClick={tryAnotherQuestion}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 text-center"
                >
                  Try another question
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
