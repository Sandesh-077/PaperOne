'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Subject details page
interface SubjectDetails {
  id: string
  name: string
  type: string
  level?: string
  color?: string
  topics: Array<{
    id: string
    name: string
    description?: string
    completed: boolean
    completedAt?: string
    order: number
    subtopics: Array<{
      id: string
      name: string
      completed: boolean
      order: number
    }>
    _count: {
      revisions: number
      practicePapers: number
      notes: number
    }
  }>
}

export default function SubjectDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { status } = useSession()
  const [subject, setSubject] = useState<SubjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [showSubtopicForm, setShowSubtopicForm] = useState<string | null>(null)
  const [topicFormData, setTopicFormData] = useState({ name: '', description: '' })
  const [subtopicFormData, setSubtopicFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchSubject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router])

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/subjects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSubject(data)
      }
    } catch (error) {
      console.error('Failed to fetch subject:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: params.id,
          ...topicFormData
        })
      })
      if (response.ok) {
        setShowTopicForm(false)
        setTopicFormData({ name: '', description: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add topic:', error)
    }
  }

  const handleAddSubtopic = async (e: React.FormEvent, topicId: string) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/subtopics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          ...subtopicFormData
        })
      })
      if (response.ok) {
        setShowSubtopicForm(null)
        setSubtopicFormData({ name: '', description: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add subtopic:', error)
    }
  }

  const toggleTopicComplete = async (topicId: string, completed: boolean) => {
    try {
      await fetch(`/api/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      fetchSubject()
    } catch (error) {
      console.error('Failed to update topic:', error)
    }
  }

  const toggleSubtopicComplete = async (subtopicId: string, completed: boolean) => {
    try {
      await fetch(`/api/subtopics/${subtopicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      fetchSubject()
    } catch (error) {
      console.error('Failed to update subtopic:', error)
    }
  }

  if (loading || !subject) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/subjects')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: subject.color || '#3B82F6' }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
              <p className="text-sm text-gray-600">{subject.type} {subject.level && `• ${subject.level}`}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowTopicForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Topic
        </button>
      </div>

      {/* Add Topic Modal */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Topic</h2>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  value={topicFormData.name}
                  onChange={(e) => setTopicFormData({ ...topicFormData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Mechanics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={topicFormData.description}
                  onChange={(e) => setTopicFormData({ ...topicFormData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Topic
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopicForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topics List */}
      {subject.topics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No topics yet. Add your first topic to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subject.topics.map((topic) => (
            <div key={topic.id} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={topic.completed}
                    onChange={(e) => toggleTopicComplete(topic.id, e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${topic.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {topic.name}
                    </h3>
                    {topic.description && (
                      <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                    )}
                    {topic.completed && topic.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Completed {new Date(topic.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSubtopicForm(topic.id)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Subtopic
                </button>
              </div>

              {/* Subtopics */}
              {topic.subtopics.length > 0 && (
                <div className="ml-8 mt-3 space-y-2">
                  {topic.subtopics.map((subtopic) => (
                    <div key={subtopic.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={subtopic.completed}
                        onChange={(e) => toggleSubtopicComplete(subtopic.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm ${subtopic.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {subtopic.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Subtopic Form */}
              {showSubtopicForm === topic.id && (
                <div className="ml-8 mt-3 bg-gray-50 rounded-lg p-4">
                  <form onSubmit={(e) => handleAddSubtopic(e, topic.id)} className="space-y-3">
                    <input
                      type="text"
                      value={subtopicFormData.name}
                      onChange={(e) => setSubtopicFormData({ ...subtopicFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Subtopic name..."
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSubtopicForm(null)}
                        className="bg-gray-200 text-gray-700 px-3 py-1 text-sm rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-500 mt-3 ml-8">
                {topic._count.revisions > 0 && (
                  <span>📝 {topic._count.revisions} revisions</span>
                )}
                {topic._count.practicePapers > 0 && (
                  <span>📄 {topic._count.practicePapers} papers</span>
                )}
                {topic._count.notes > 0 && (
                  <span>📝 {topic._count.notes} notes</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
