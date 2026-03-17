'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface PaperTopic {
  id: string
  subject: string
  subjectName: string
  paperCode: string
  paperName: string
  topicName: string
  topicOrder: number
  source: string
  confidenceScore: number
  sessionsLogged: number
  lastStudied: string | null
  needsRevision: boolean
  createdAt: string
  updatedAt: string
}

interface Paper {
  paperCode: string
  paperName: string
  topics: PaperTopic[]
}

export default function TopicsPage() {
  const { data: session } = useSession()
  const [topics, setTopics] = useState<PaperTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set())
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingPaper, setEditingPaper] = useState<string | null>(null)
  const [newTopicInput, setNewTopicInput] = useState<string>('')

  // Fetch topics on mount and when subject changes
  useEffect(() => {
    if (!session) return

    const fetchTopics = async () => {
      setLoading(true)
      try {
        const url = new URL('/api/paper-topics', window.location.origin)
        if (selectedSubject) url.searchParams.append('subject', selectedSubject)
        
        console.log('🔵 Fetching topics from:', url.toString())
        const response = await fetch(url)
        console.log('🟢 Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Topics received:', data.topics)
          setTopics(data.topics || [])
          
          // Set default selected subject to first subject if not set
          if (!selectedSubject && data.topics.length > 0) {
            const firstSubject = data.topics[0].subject
            console.log('📌 Setting default subject:', firstSubject)
            setSelectedSubject(firstSubject)
          }
        } else {
          const error = await response.text()
          console.error('❌ API Error:', response.status, error)
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTopics()
  }, [session, selectedSubject])

  // Note: fetchTopics moved inside useEffect to avoid dependency issues

  // Group topics by paper
  const filteredTopics = selectedSubject
    ? topics.filter(t => t.subject === selectedSubject)
    : topics

  const papersByCode = filteredTopics.reduce((acc, topic) => {
    const existing = acc.find(p => p.paperCode === topic.paperCode)
    if (existing) {
      existing.topics.push(topic)
    } else {
      acc.push({
        paperCode: topic.paperCode,
        paperName: topic.paperName,
        topics: [topic]
      })
    }
    return acc
  }, [] as Paper[])

  // Sort papers by code
  const sortedPapers = papersByCode.sort((a, b) => a.paperCode.localeCompare(b.paperCode))

  // Calculate stats
  const ready = filteredTopics.filter(t => t.confidenceScore >= 4).length
  const needWork = filteredTopics.filter(t => t.confidenceScore >= 1 && t.confidenceScore <= 3).length
  const notStarted = filteredTopics.filter(t => t.confidenceScore === 0).length
  const totalTopics = filteredTopics.length

  // Get unique subjects
  const subjects = [...new Set(topics.map(t => t.subject))]

  const handleConfidenceChange = async (topicId: string, newScore: number) => {
    try {
      const response = await fetch(`/api/paper-topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceScore: newScore })
      })

      if (response.ok) {
        // Update local state
        setTopics(topics.map(t => 
          t.id === topicId ? { ...t, confidenceScore: newScore, needsRevision: newScore <= 2 } : t
        ))
        setEditingTopicId(null)
      }
    } catch (err) {
      console.error('Failed to update topic:', err)
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Delete this topic?')) return
    
    try {
      const response = await fetch(`/api/paper-topics/${topicId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTopics(topics.filter(t => t.id !== topicId))
      }
    } catch (err) {
      console.error('Failed to delete topic:', err)
    }
  }

  const handleAddTopic = async (paperCode: string, subject: string) => {
    if (!newTopicInput.trim()) return

    try {
      const paper = topics.find(t => t.paperCode === paperCode)
      if (!paper) {
        console.error('Paper not found:', paperCode)
        return
      }

      const payload = {
        subject: subject,
        subjectName: paper.subjectName,
        paperCode: paperCode,
        paperName: paper.paperName,
        topicName: newTopicInput.trim(),
        source: 'manual'
      }

      console.log('➕ Adding topic with payload:', payload)
      const response = await fetch('/api/paper-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      console.log('📮 Add topic response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Topic created:', data.topic)
        setTopics([...topics, data.topic])
        setNewTopicInput('')
      } else {
        const error = await response.text()
        console.error('❌ Failed to add topic:', response.status, error)
      }
    } catch (err) {
      console.error('Failed to add topic:', err)
    }
  }

  const togglePaper = (paperCode: string) => {
    const newExpanded = new Set(expandedPapers)
    if (newExpanded.has(paperCode)) {
      newExpanded.delete(paperCode)
    } else {
      newExpanded.add(paperCode)
    }
    setExpandedPapers(newExpanded)
  }

  const getConfidenceColor = (score: number) => {
    if (score === 0) return 'bg-gray-100 text-gray-600'
    if (score === 1) return 'bg-red-100 text-red-700'
    if (score === 2) return 'bg-orange-100 text-orange-700'
    if (score === 3) return 'bg-yellow-100 text-yellow-700'
    if (score === 4) return 'bg-green-100 text-green-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  const getConfidenceEmoji = (score: number) => {
    const emojis = ['😕', '😕', '😐', '🙂', '😊', '😊']
    return emojis[score] || '❓'
  }

  const getLastStudiedText = (lastStudied: string | null) => {
    if (!lastStudied) return 'Never'
    const date = new Date(lastStudied)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Loading topics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Paper Topics</h1>
        <p className="text-gray-600 mt-1">Track and revise topics for each exam paper</p>
      </div>

      {/* Stats Cards */}
      {totalTopics > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 font-medium">Ready for Exam</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{ready}</p>
            <p className="text-xs text-gray-500 mt-1">{totalTopics > 0 ? Math.round((ready / totalTopics) * 100) : 0}% confident</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 font-medium">Needs Work</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{needWork}</p>
            <p className="text-xs text-gray-500 mt-1">{totalTopics > 0 ? Math.round((needWork / totalTopics) * 100) : 0}% need practice</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 font-medium">Not Started</p>
            <p className="text-2xl font-bold text-gray-600 mt-1">{notStarted}</p>
            <p className="text-xs text-gray-500 mt-1">{totalTopics > 0 ? Math.round((notStarted / totalTopics) * 100) : 0}% untouched</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 font-medium">Total Topics</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalTopics}</p>
            <p className="text-xs text-gray-500 mt-1">Across all papers</p>
          </div>
        </div>
      )}

      {/* Subject Tabs */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-wrap gap-0 border-b border-gray-200">
            {subjects.map(subject => {
              const subjectTopics = topics.filter(t => t.subject === subject)
              const subjectReady = subjectTopics.filter(t => t.confidenceScore >= 4).length
              return (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-3 font-medium transition ${
                    selectedSubject === subject
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>{subject}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {subjectReady}/{subjectTopics.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* All Topics for Selected Subject */}
      {selectedSubject && filteredTopics.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📌 All Topics for {selectedSubject}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTopics.map(topic => (
              <div key={topic.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-xs">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0 mt-1">{getConfidenceEmoji(topic.confidenceScore)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate">{topic.topicName}</h3>
                    <p className="text-xs text-gray-600 mt-1">{topic.paperCode}</p>
                    {topic.needsRevision && (
                      <p className="text-xs text-amber-700 font-medium mt-1">⚠️ Needs revision</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Papers and Topics */}
      <div className="space-y-3">
        {sortedPapers.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No topics loaded yet. Add an exam in planner setup to load topics.</p>
          </div>
        ) : (
          sortedPapers.map(paper => {
            const paperReady = paper.topics.filter(t => t.confidenceScore >= 4).length
            const isExpanded = expandedPapers.has(paper.paperCode)
            
            return (
              <div key={paper.paperCode} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Paper Header */}
                <button
                  onClick={() => togglePaper(paper.paperCode)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-xl">{isExpanded ? '📋' : '📄'}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{paper.paperCode}</h3>
                      <p className="text-sm text-gray-600">{paper.paperName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(paperReady / paper.topics.length) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{paperReady}/{paper.topics.length} confident</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPaper(editingPaper === paper.paperCode ? null : paper.paperCode)
                      }}
                      className={`px-3 py-1 text-sm font-medium rounded transition ${
                        editingPaper === paper.paperCode
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {editingPaper === paper.paperCode ? '✓ Done' : '✏️ Edit'}
                    </button>
                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* Topics List */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {paper.topics
                      .sort((a, b) => a.topicOrder - b.topicOrder)
                      .map(topic => (
                        <div
                          key={topic.id}
                          className={`px-6 py-4 border-b border-gray-100 last:border-b-0 transition flex items-center justify-between ${
                            editingPaper === paper.paperCode ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              {topic.needsRevision && (
                                <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                              )}
                              <div className="min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm">{topic.topicName}</h4>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                                  <span>📚 {topic.sessionsLogged} sessions</span>
                                  <span>📅 {getLastStudiedText(topic.lastStudied)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            {editingPaper === paper.paperCode ? (
                              <button
                                onClick={() => handleDeleteTopic(topic.id)}
                                className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                              >
                                🗑️ Delete
                              </button>
                            ) : (
                              <>
                                {editingTopicId === topic.id ? (
                                  <div className="flex gap-1">
                                    {[0, 1, 2, 3, 4, 5].map(score => (
                                      <button
                                        key={score}
                                        onClick={() => handleConfidenceChange(topic.id, score)}
                                        className={`w-8 h-8 rounded text-sm font-medium transition ${getConfidenceColor(score)}`}
                                        title={score === 0 ? 'Not started' : `Confidence ${score}`}
                                      >
                                        {getConfidenceEmoji(score)}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingTopicId(topic.id)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${getConfidenceColor(topic.confidenceScore)}`}
                                  >
                                    {getConfidenceEmoji(topic.confidenceScore)} {topic.confidenceScore > 0 ? topic.confidenceScore : 'Start'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                    {/* Add New Topic Section */}
                    {editingPaper === paper.paperCode && (
                      <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Add New Topic</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTopicInput}
                            onChange={(e) => setNewTopicInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddTopic(paper.paperCode, selectedSubject)
                              }
                            }}
                            placeholder="Enter topic name..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleAddTopic(paper.paperCode, selectedSubject)}
                            disabled={!newTopicInput.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
