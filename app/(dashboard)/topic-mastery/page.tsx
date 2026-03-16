'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface TopicMasteryData {
  id: string
  subject: string
  topicName: string
  confidenceScore: number
  sessionsLogged: number
  lastRevised: Date | null
  needsRevision: boolean
}

const confidenceEmojis = ['😕', '😕', '😐', '🙂', '😊']

export default function TopicMasteryPage() {
  const { data: session } = useSession()
  const [topics, setTopics] = useState<TopicMasteryData[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopics()
  }, [])

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topic-mastery')
      if (res.ok) {
        const data = await res.json()
        setTopics(data)
        // Set first subject as default if available
        const uniqueSubjects = [...new Set(data.map((t: TopicMasteryData) => t.subject))]
        if (uniqueSubjects.length > 0 && !selectedSubject) {
          setSelectedSubject(uniqueSubjects[0])
        }
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfidenceChange = async (topicId: string, newScore: number) => {
    try {
      const res = await fetch(`/api/topic-mastery/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceScore: newScore })
      })
      if (res.ok) {
        fetchTopics()
      }
    } catch (error) {
      console.error('Error updating topic:', error)
    }
  }

  const getDaysAgo = (date: Date | null) => {
    if (!date) return 'Never revised'
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Revised today'
    return `${days}d ago`
  }

  const subjects = [...new Set(topics.map(t => t.subject))]
  const filteredTopics = selectedSubject
    ? topics.filter(t => t.subject === selectedSubject)
    : topics

  const needsRevisionCount = topics.filter(t => t.needsRevision).length
  const confidentCount = topics.filter(t => t.confidenceScore >= 4).length

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📚 Topic Mastery</h1>

      {/* Stat Pills */}
      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-600 font-semibold">{needsRevisionCount}</span>
          <span className="text-amber-700 text-sm">need revision</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-600 font-semibold">{confidentCount}</span>
          <span className="text-green-700 text-sm">confident (4-5)</span>
        </div>
      </div>

      {/* Subject Tabs */}
      {subjects.length > 0 && (
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {subjects.map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                selectedSubject === subject
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading topics...</div>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No topics logged yet. Start with Session Log!</div>
      ) : (
        <div className="space-y-2">
          {filteredTopics.map(topic => (
            <div
              key={topic.id}
              className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all ${
                topic.needsRevision
                  ? 'border-l-4 border-l-amber-500 border-r border-b border-t border-gray-200'
                  : 'border border-gray-200'
              }`}
            >
              {/* Left: Topic name and last revised */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{topic.topicName}</h3>
                <p className="text-sm text-gray-500">{getDaysAgo(topic.lastRevised)}</p>
              </div>

              {/* Middle: Sessions badge */}
              <div className="mx-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {topic.sessionsLogged} session{topic.sessionsLogged !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Right: Confidence emoji picker */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => handleConfidenceChange(topic.id, score)}
                    className={`text-2xl p-1 rounded transition-all ${
                      topic.confidenceScore === score
                        ? 'bg-blue-100 scale-110'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                    title={`Confidence: ${score}`}
                  >
                    {confidenceEmojis[score - 1]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
