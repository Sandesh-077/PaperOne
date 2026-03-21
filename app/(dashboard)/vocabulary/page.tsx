'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Vocabulary {
  id: string
  word: string
  definition: string
  sentences: string[]
  learned: boolean
  category?: string
  createdAt: string
}

interface WordTeaching {
  word: string
  definition: string
  academicExample: string
  synonyms: Array<{ word: string; nuance: string }>
  gpTip: string
}

interface VocabularySuggestion {
  original: string
  alternatives: string[]
  why: string
}

interface VocabularyFeedback {
  suggestions: VocabularySuggestion[]
}

export default function VocabularyPage() {
  // Vocabulary learning and tracking page for Cambridge A-Level General Paper
  const router = useRouter()
  const { status } = useSession()
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([])
  const [dailyWords, setDailyWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'learn' | 'improve'>('learn')
  const [learnWord, setLearnWord] = useState('')
  const [improvePassage, setImprovePassage] = useState('')
  const [teachingLoading, setTeachingLoading] = useState(false)
  const [improveLoading, setImproveLoading] = useState(false)
  const [teaching, setTeaching] = useState<WordTeaching | null>(null)
  const [suggestions, setSuggestions] = useState<VocabularySuggestion[]>([])
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    word: '',
    definition: '',
    sentences: [''],
    category: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchVocabulary()
      fetchDailyWords()
    }
  }, [status, router])

  const fetchDailyWords = async () => {
    try {
      const response = await fetch('/api/ai/daily-words')
      if (response.ok) {
        const data = await response.json()
        // Safely extract words array
        const words = Array.isArray(data?.words) ? data.words : Array.isArray(data) ? data : []
        setDailyWords(words)
      } else {
        console.error('Failed to fetch daily words:', response.status)
        setDailyWords([])
      }
    } catch (error) {
      console.error('Failed to fetch daily words:', error)
      setDailyWords([])
    }
  }

  const fetchVocabulary = async () => {
    try {
      const response = await fetch('/api/vocabulary')
      if (response.ok) {
        const data = await response.json()
        // Ensure data is always an array
        setVocabulary(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch vocabulary:', response.status)
        setVocabulary([])
      }
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error)
      setVocabulary([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkLearned = async (wordId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'learned' ? 'learning' : 'learned'
      await fetch('/api/vocabulary-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId,
          status: newStatus,
          confidenceLevel: newStatus === 'learned' ? 5 : 3
        })
      })
      fetchDailyWords()
    } catch (error) {
      console.error('Failed to update word status:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ word: '', definition: '', sentences: [''], category: '' })
        setShowForm(false)
        fetchVocabulary()
      }
    } catch (error) {
      console.error('Failed to create vocabulary:', error)
    }
  }

  const toggleLearned = async (id: string, learned: boolean) => {
    try {
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learned: !learned })
      })
      fetchVocabulary()
    } catch (error) {
      console.error('Failed to update vocabulary:', error)
    }
  }

  const deleteVocab = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vocabulary?')) return
    
    try {
      await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
      fetchVocabulary()
    } catch (error) {
      console.error('Failed to delete vocabulary:', error)
    }
  }

  const handleTeachWord = async () => {
    if (!learnWord.trim()) {
      setError('Please enter a word')
      return
    }

    setTeachingLoading(true)
    setError('')
    setTeaching(null)

    try {
      const response = await fetch('/api/ai/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'word', word: learnWord.trim() })
      })

      if (!response.ok) {
        const err = await response.json()
        setError(err.error || 'Failed to teach word')
        return
      }

      const result = await response.json()
      setTeaching(result)
    } catch (error) {
      console.error('Error teaching word:', error)
      setError('Failed to teach word. Please try again.')
    } finally {
      setTeachingLoading(false)
    }
  }

  const handleImproveWriting = async () => {
    if (!improvePassage.trim()) {
      setError('Please enter some text')
      return
    }

    setImproveLoading(true)
    setError('')
    setSuggestions([])

    try {
      const response = await fetch('/api/ai/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'passage', passage: improvePassage.trim() })
      })

      if (!response.ok) {
        const err = await response.json()
        setError(err.error || 'Failed to improve writing')
        return
      }

      const result = await response.json()
      setSuggestions(result.suggestions || [])
    } catch (error) {
      console.error('Error improving writing:', error)
      setError('Failed to improve writing. Please try again.')
    } finally {
      setImproveLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  // Safely calculate learned count with proper null checks
  const learnedCount = (dailyWords && Array.isArray(dailyWords) && dailyWords.length > 0) 
    ? dailyWords.filter((w: any) => w?.userProgress?.status === 'learned').length 
    : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vocabulary</h1>
          <p className="text-gray-600 mt-1">Build your EGP vocabulary with context</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Word'}
        </button>
      </div>

      {/* Today's 5 Words Section */}
      {dailyWords && Array.isArray(dailyWords) && dailyWords.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📚 Today&apos;s Vocabulary Focus
              <span className="text-sm font-normal text-gray-600 ml-2">({learnedCount}/5 mastered)</span>
            </h2>
            <a href="/learning-journal" className="text-sm text-purple-600 hover:text-purple-700 font-semibold">
              Go to Journal →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {dailyWords && Array.isArray(dailyWords) && dailyWords.map((word: any) => {
              const status = word.userProgress?.status || 'learning'
              const statusColorMap: Record<string, string> = {
                'learned': 'bg-green-100 border-green-300 text-green-900',
                'learning': 'bg-blue-100 border-blue-300 text-blue-900',
                'needs_practice': 'bg-orange-100 border-orange-300 text-orange-900'
              }
              const statusColor = statusColorMap[status] || 'bg-gray-100 border-gray-300 text-gray-900'

              return (
                <div key={word?.id || Math.random()} className={`p-4 rounded-lg border-2 ${statusColor}`}>
                  <h3 className="font-bold text-lg mb-1">{word?.word || 'Unknown'}</h3>
                  <p className="text-xs opacity-75 mb-2 line-clamp-2">{word?.definition || 'No definition'}</p>
                  <div className="flex items-center gap-1 mb-2 text-xs">
                    <span className="font-semibold">{word?.category || 'General'}</span>
                    <span>•</span>
                    <span>Level {word?.difficulty || 'N/A'}</span>
                  </div>
                  <div className="flex gap-1 text-lg mb-2">
                    {Array.from({ length: Math.max(0, word?.userProgress?.confidenceLevel || 0) }).map((_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - (word?.userProgress?.confidenceLevel || 0)) }).map((_, i) => (
                      <span key={i} className="opacity-25">☆</span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleMarkLearned(word?.id, word?.userProgress?.status)}
                    className="w-full text-xs bg-white bg-opacity-50 hover:bg-opacity-75 py-1 px-2 rounded transition font-semibold"
                    disabled={!word?.id}
                  >
                    {word?.userProgress?.status === 'learned' ? '✓ Mastered' : 'Mark Learned'}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex gap-4">
            <a href="/writing-practice" className="flex-1 text-center bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition font-semibold text-sm">
              Practice Writing
            </a>
            <a href="/grammar-coach" className="flex-1 text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm">
              Grammar Coach
            </a>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-green-600">{learnedCount}</p>
          <p className="text-xs text-gray-600 mt-1">Words Mastered Today</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
          <p className="text-2xl font-bold text-blue-600">{vocabulary && Array.isArray(vocabulary) ? vocabulary.length : 0}</p>
          <p className="text-xs text-gray-600 mt-1">Total Vocabulary</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 text-center hidden md:block">
          <p className="text-2xl font-bold text-purple-600">{Math.round((learnedCount / 5) * 100)}</p>
          <p className="text-xs text-gray-600 mt-1">% Daily Target</p>
        </div>
      </div>

      {/* Learning Tabs */}
      <div className="bg-white border-b border-gray-200 rounded-t-lg">
        <div className="flex">
          <button
            onClick={() => {
              setActiveTab('learn')
              setError('')
              setTeaching(null)
              setSuggestions([])
            }}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'learn'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📚 Learn a Word
          </button>
          <button
            onClick={() => {
              setActiveTab('improve')
              setError('')
              setTeaching(null)
              setSuggestions([])
            }}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'improve'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ✨ Improve My Writing
          </button>
        </div>
      </div>

      {/* Learn a Word Tab */}
      {activeTab === 'learn' && (
        <div className="bg-white p-6 rounded-b-lg shadow-sm border border-t-0 border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter a word to learn</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={learnWord}
                  onChange={(e) => {
                    setLearnWord(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g., serendipity, cogent, pragmatic..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleTeachWord}
                  disabled={teachingLoading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {teachingLoading ? '🔄 Teaching...' : '📖 Teach Me'}
                </button>
              </div>
            </div>

            {error && activeTab === 'learn' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {teaching && (
              <div className="space-y-4 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-baseline gap-2 mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{teaching.word}</h3>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Definition</h4>
                  <p className="text-green-800">{teaching.definition}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Academic Example</h4>
                  <p className="text-blue-800 italic">&ldquo;{teaching.academicExample || teaching.definition}&rdquo;</p>
                </div>

                {Array.isArray(teaching.synonyms) && teaching.synonyms.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900">Synonyms & Nuance</h4>
                    <div className="grid gap-2">
                      {teaching.synonyms.map((syn, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="font-semibold text-gray-900">{syn?.word || 'N/A'}</p>
                          <p className="text-sm text-gray-700 mt-1">{syn?.nuance || ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">💡 GP Tip</h4>
                  <p className="text-purple-800">{teaching.gpTip || 'Use this word to enhance your writing.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Improve My Writing Tab */}
      {activeTab === 'improve' && (
        <div className="bg-white p-6 rounded-b-lg shadow-sm border border-t-0 border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste your passage to improve vocabulary</label>
              <textarea
                value={improvePassage}
                onChange={(e) => {
                  setImprovePassage(e.target.value)
                  setError('')
                }}
                placeholder="Paste a paragraph from your essay or practice writing..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {error && activeTab === 'improve' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleImproveWriting}
              disabled={improveLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {improveLoading ? '🔄 Analyzing...' : '✨ Find Better Words'}
            </button>

            {Array.isArray(suggestions) && suggestions.length > 0 && (
              <div className="space-y-3 mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900">Vocabulary Suggestions</h4>
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold text-gray-900">{suggestion?.original || 'Word'}</span>
                      <span className="text-gray-400">→</span>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(suggestion?.alternatives) && suggestion.alternatives.map((alt, altIdx) => (
                          <span key={altIdx} className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-100">
                      <strong>Why:</strong> {suggestion?.why || 'Consider this alternative.'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(suggestions) && suggestions.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <p className="text-green-700 font-medium">✓ Your vocabulary usage is strong! Consider adding more discipline-specific terms.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Word Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New Vocabulary</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
              <input
                type="text"
                value={formData.word}
                onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Juxtaposition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Definition</label>
              <textarea
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Define the word..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Example Sentences</label>
              {Array.isArray(formData?.sentences) && formData.sentences.map((sentence, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={sentence || ''}
                    onChange={(e) => {
                      const newSentences = [...(formData?.sentences || [])]
                      newSentences[index] = e.target.value
                      setFormData({ ...formData, sentences: newSentences })
                    }}
                    required={index === 0}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Use the word in a sentence..."
                  />
                  {Array.isArray(formData?.sentences) && formData.sentences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSentences = formData.sentences.filter((_, i) => i !== index)
                        setFormData({ ...formData, sentences: newSentences })
                      }}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sentences: [...(formData?.sentences || []), ''] })}
                className="text-sm text-green-600 hover:text-green-700"
              >
                + Add another sentence
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Academic, Formal"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Vocabulary
            </button>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Vocabulary</h2>
        <div className="space-y-4">
        {!vocabulary || !Array.isArray(vocabulary) || vocabulary.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No vocabulary yet. Start building your word bank!</p>
          </div>
        ) : (
          vocabulary.map((vocab) => (
            <div
              key={vocab.id}
              className={`bg-white p-6 rounded-lg shadow-sm border ${
                vocab.learned ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{vocab.word}</h3>
                    {vocab.category && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {vocab.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{vocab.definition}</p>
                  {Array.isArray(vocab.sentences) && vocab.sentences.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {vocab.sentences.map((sentence, idx) => (
                        <p key={idx} className="text-gray-600 italic text-sm ml-4">• &ldquo;{sentence}&rdquo;</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleLearned(vocab.id, vocab.learned)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      vocab.learned
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {vocab.learned ? '✓ Learned' : 'Mark Learned'}
                  </button>
                  <button
                    onClick={() => deleteVocab(vocab.id)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  )
}
