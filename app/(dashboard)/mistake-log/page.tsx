'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const SUBJECTS = [
  '9701 Chemistry',
  '9702 Physics',
  '9709 Mathematics',
  '9618 Computer Science',
  '8021 English GP'
]

interface MistakeLogEntry {
  id: string
  date: string
  subject: string
  topic: string
  whatWentWrong: string
  correctMethod: string
  formulaOrConcept: string
  mistakeType: string
  reviewed: boolean
}

export default function MistakeLogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: SUBJECTS[0],
    topic: '',
    whatWentWrong: '',
    correctMethod: '',
    formulaOrConcept: '',
    mistakeType: 'Concept'
  })
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewMode, setReviewMode] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [revealCorrectMethod, setRevealCorrectMethod] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'unreviewed' | 'Concept' | 'Formula' | 'Careless'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      fetchMistakes()
    }
  }, [status, router])

  const fetchMistakes = async () => {
    try {
      const res = await fetch('/api/mistake-log?limit=30')
      if (res.ok) {
        const data = await res.json()
        setMistakes(data)
      }
    } catch (error) {
      console.error('Error fetching mistakes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/mistake-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          subject: SUBJECTS[0],
          topic: '',
          whatWentWrong: '',
          correctMethod: '',
          formulaOrConcept: '',
          mistakeType: 'Concept'
        })
        fetchMistakes()
      }
    } catch (error) {
      console.error('Error submitting mistake:', error)
    }
  }

  const toggleReviewed = async (id: string, currentReviewed: boolean) => {
    try {
      const res = await fetch(`/api/mistake-log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: !currentReviewed })
      })
      if (res.ok) {
        fetchMistakes()
      }
    } catch (error) {
      console.error('Error updating mistake:', error)
    }
  }

  const markReviewedAndNext = async (id: string) => {
    try {
      const res = await fetch(`/api/mistake-log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: true })
      })
      if (res.ok) {
        setReviewedCount(prev => prev + 1)
        if (currentCardIndex < unreviewed.length - 1) {
          setCurrentCardIndex(prev => prev + 1)
          setRevealCorrectMethod(false)
        } else {
          // All done
          setReviewMode(false)
        }
        fetchMistakes()
      }
    } catch (error) {
      console.error('Error updating mistake:', error)
    }
  }

  const skipCard = () => {
    if (currentCardIndex < unreviewed.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
      setRevealCorrectMethod(false)
    } else {
      // All done
      setReviewMode(false)
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 4) return 'text-green-600'
    if (score === 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRowColor = (needsRevision: boolean) => {
    return needsRevision ? 'bg-red-50' : ''
  }

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 'Never'
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    return `${days}d ago`
  }

  const unreviewed = mistakes.filter(m => !m.reviewed)
  const filtered = activeFilter === 'all' 
    ? mistakes 
    : activeFilter === 'unreviewed' 
      ? unreviewed 
      : mistakes.filter(m => m.mistakeType === activeFilter)

  if (status === 'loading' || loading) {
    return <div className="p-6">Loading...</div>
  }

  // REVIEW MODE - Flashcard view
  if (reviewMode && unreviewed.length > 0) {
    const currentMistake = unreviewed[currentCardIndex]
    const remaining = unreviewed.length - currentCardIndex

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          {/* Progress */}
          <div className="text-center mb-8">
            <p className="text-gray-600 font-semibold">{remaining} remaining</p>
          </div>

          {/* Flashcard */}
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            {/* Subject Badge */}
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                {currentMistake.subject}
              </span>
            </div>

            {/* Topic */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{currentMistake.topic}</h2>
            </div>

            {/* What went wrong */}
            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-gray-600 font-semibold mb-2">What went wrong?</p>
              <p className="text-gray-900">{currentMistake.whatWentWrong}</p>
            </div>

            {/* Mistake Type Badge */}
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                currentMistake.mistakeType === 'Concept' ? 'bg-red-100 text-red-700' :
                currentMistake.mistakeType === 'Formula' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {currentMistake.mistakeType}
              </span>
            </div>

            {/* Reveal Button */}
            {!revealCorrectMethod ? (
              <button
                onClick={() => setRevealCorrectMethod(true)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Reveal correct method →
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div>
                  <p className="text-sm text-gray-600 font-semibold mb-2">Correct Method</p>
                  <p className="text-gray-900">{currentMistake.correctMethod}</p>
                </div>
                {currentMistake.formulaOrConcept && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold mb-2">Formula / Concept</p>
                    <p className="text-gray-900">{currentMistake.formulaOrConcept}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {revealCorrectMethod && (
              <div className="flex gap-3">
                <button
                  onClick={() => markReviewedAndNext(currentMistake.id)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Got it ✓
                </button>
                <button
                  onClick={skipCard}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>

          {/* Exit Button */}
          <div className="text-center mt-8">
            <button
              onClick={() => setReviewMode(false)}
              className="text-gray-600 hover:text-gray-900 font-semibold underline"
            >
              Exit review mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Completion Screen
  if (reviewMode && unreviewed.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-green-900 mb-2">All cleared!</h1>
          <p className="text-gray-600 mb-8">You reviewed {reviewedCount} mistakes and learned from them.</p>
          <button
            onClick={() => {
              setReviewMode(false)
              setReviewedCount(0)
              setCurrentCardIndex(0)
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to list
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mistake Log</h1>
        {unreviewed.length > 0 && (
          <button
            onClick={() => {
              setReviewMode(true)
              setCurrentCardIndex(0)
              setReviewedCount(0)
              setRevealCorrectMethod(false)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            📚 Review Mode
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Log New Mistake</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              placeholder="e.g., Organic Chemistry, Thermodynamics"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">What Went Wrong?</label>
              <textarea
                value={formData.whatWentWrong}
                onChange={(e) => setFormData({...formData, whatWentWrong: e.target.value})}
                placeholder="Describe the mistake..."
                className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correct Method</label>
              <textarea
                value={formData.correctMethod}
                onChange={(e) => setFormData({...formData, correctMethod: e.target.value})}
                placeholder="How should it be done?"
                className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Formula or Concept</label>
              <input
                type="text"
                value={formData.formulaOrConcept}
                onChange={(e) => setFormData({...formData, formulaOrConcept: e.target.value})}
                placeholder="e.g., e = mc², second law of thermodynamics"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mistake Type</label>
              <select
                value={formData.mistakeType}
                onChange={(e) => setFormData({...formData, mistakeType: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option>Concept</option>
                <option>Formula</option>
                <option>Careless</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Mistake
          </button>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'unreviewed', 'Concept', 'Formula', 'Careless'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter === 'all' ? 'All' :
             filter === 'unreviewed' ? `Unreviewed (${unreviewed.length})` :
             filter}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-bold p-6 border-b">Recent Mistakes (Last 30)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Topic</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">What Went Wrong</th>
                <th className="px-4 py-2 text-center">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(mistake => (
                <tr
                  key={mistake.id}
                  className={mistake.reviewed ? 'bg-gray-100 text-gray-600' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-2">{new Date(mistake.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-medium">{mistake.subject}</td>
                  <td className="px-4 py-2">{mistake.topic}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      mistake.mistakeType === 'Concept' ? 'bg-red-100 text-red-700' :
                      mistake.mistakeType === 'Formula' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {mistake.mistakeType}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">{mistake.whatWentWrong}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={mistake.reviewed}
                      onChange={() => toggleReviewed(mistake.id, mistake.reviewed)}
                      className="cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
