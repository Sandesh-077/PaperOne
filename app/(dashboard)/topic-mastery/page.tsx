'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const SUBJECTS = ['9701 Chemistry', '9702 Physics', '9709 Mathematics', '9618 Computer Science', '8021 English GP']

interface TopicMasteryData {
  id: string
  subject: string
  topicName: String
  confidenceScore: number
  sessionsLogged: number
  lastRevised: Date | null
  needsRevision: boolean
}

export default function TopicMasteryPage() {
  const { data: session } = useSession()
  const [topics, setTopics] = useState<TopicMasteryData[]>([])
  const [filter, setFilter] = useState('all')
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

  const filtered = filter === 'needsRevision' ? topics.filter(t => t.needsRevision) : topics

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📚 Topic Mastery</h1>

      <div className="mb-6 flex gap-4">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>All Topics</button>
        <button onClick={() => setFilter('needsRevision')} className={`px-4 py-2 rounded ${filter === 'needsRevision' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>⚠️ Needs Revision</button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading topics...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500">No topics logged yet. Start with Session Log!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Topic</th>
                <th className="px-4 py-2 text-center">Confidence</th>
                <th className="px-4 py-2 text-center">Sessions</th>
                <th className="px-4 py-2 text-center">Last Revised</th>
                <th className="px-4 py-2 text-center">Revision</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(topic => (
                <tr key={topic.id} className={`border-t ${getRowColor(topic.needsRevision)}`}>
                  <td className="px-4 py-2">{topic.subject}</td>
                  <td className="px-4 py-2">{topic.topicName}</td>
                  <td className="px-4 py-2 text-center">
                    <select value={topic.confidenceScore} onChange={(e) => handleConfidenceChange(topic.id, parseInt(e.target.value))} className={`border rounded px-2 py-1 ${getConfidenceColor(topic.confidenceScore)}`}>
                      <option value="1">1 (Very Low)</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5 (Very High)</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center font-semibold">{topic.sessionsLogged}</td>
                  <td className="px-4 py-2 text-center text-sm text-gray-600">{getDaysAgo(topic.lastRevised)}</td>
                  <td className="px-4 py-2 text-center">{topic.needsRevision ? '🔴 Yes' : '✅ No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
