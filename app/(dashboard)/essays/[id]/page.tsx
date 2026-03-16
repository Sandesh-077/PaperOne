'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Essay {
  id: string
  title: string
  prompt?: string
  content: string
  wordCount: number
  grade?: string
  notes?: string
  essayType?: string
  aiFeedback?: any
  aiFeedbackAt?: string
  createdAt: string
}

export default function ViewEssayPage() {
  const router = useRouter()
  const params = useParams()
  const [essay, setEssay] = useState<Essay | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [generatingFeedback, setGeneratingFeedback] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    essayType: 'full' as string,
    content: '',
    grade: '',
    notes: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchEssay()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchEssay = async () => {
    try {
      const response = await fetch(`/api/essays/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setEssay(data)
        setFormData({
          title: data.title,
          prompt: data.prompt || '',
          essayType: data.essayType || 'full',
          content: data.content,
          grade: data.grade || '',
          notes: data.notes || ''
        })
        if (data.aiFeedback) {
          setFeedback(data.aiFeedback)
        }
      }
    } catch (error) {
      console.error('Failed to fetch essay:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/essays/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setEditing(false)
        fetchEssay()
      }
    } catch (error) {
      console.error('Failed to update essay:', error)
    }
  }

  const generateFeedback = async () => {
    setGeneratingFeedback(true)
    try {
      const response = await fetch(`/api/essays/${params.id}/feedback`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
      } else {
        alert('Failed to generate feedback')
      }
    } catch (error) {
      console.error('Failed to generate feedback:', error)
      alert('Error generating feedback')
    } finally {
      setGeneratingFeedback(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  if (!essay) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Essay not found</p>
        <Link href="/essays" className="text-purple-600 hover:underline">
          Back to Essays
        </Link>
      </div>
    )
  }

  const wordCount = formData.content.trim().split(/\s+/).filter(w => w.length > 0).length

  if (editing) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Essay</h1>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Essay Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Essay Type *</label>
              <div className="flex flex-wrap gap-2">
                {['full', 'introduction', 'conclusion', 'argument', 'counterclaim', 'rebuttal'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, essayType: type })}
                    className={`px-4 py-2 rounded-full font-medium transition-colors ${
                      formData.essayType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type === 'full' ? 'Full Essay' :
                     type === 'introduction' ? 'Introduction' :
                     type === 'conclusion' ? 'Conclusion' :
                     type === 'argument' ? 'Argument Paragraph' :
                     type === 'counterclaim' ? 'Counter-claim' :
                     'Rebuttal'}
                  </button>
                ))}
              </div>
            </div>

            <div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Content</label>
                <span className="text-sm text-gray-500">{wordCount} words</span>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/essays" className="text-purple-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Essays
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{essay.title}</h1>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>{essay.wordCount} words</span>
            {essay.grade && <span>Grade: {essay.grade}</span>}
            <span>{new Date(essay.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 space-y-6">
        {essay.prompt && (
          <div className="pb-6 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">PROMPT</h3>
            <p className="text-gray-900 italic">{essay.prompt}</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ESSAY</h3>
          <div className="prose max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{essay.content}</p>
          </div>
        </div>

        {/* AI Feedback Button */}
        {essay.id && (
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={generateFeedback}
              disabled={generatingFeedback}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {generatingFeedback ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Analysing against GP 8021 mark scheme...
                </>
              ) : feedback ? (
                <>
                  🔄 Regenerate AI Feedback
                </>
              ) : (
                <>
                  ✨ Get AI Feedback (GP 8021)
                </>
              )}
            </button>
          </div>
        )}

        {/* Feedback Results */}
        {feedback && (
          <div className="pt-6 border-t border-gray-200 space-y-6">
            <div className="relative">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 CAMBRIDGE GP 8021 EVALUATION</h3>
              
              {/* Three AO Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* AO1 Content */}
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-bold text-blue-900 text-lg">{feedback.ao1?.band || 'Band'}</h4>
                    <p className="text-sm text-blue-700 font-semibold">{feedback.ao1?.score || 'Score'}</p>
                    <p className="text-xs text-blue-600 mt-1">AO1: Content</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-blue-900 mb-2">✓ Strengths:</p>
                    <ul className="text-xs text-blue-800 space-y-1">
                      {feedback.ao1?.strengths?.map((s: string, i: number) => (
                        <li key={i} className="ml-2">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-orange-900 mb-2">→ Improvements:</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {feedback.ao1?.improvements?.map((imp: string, i: number) => (
                        <li key={i} className="ml-2">• {imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* AO2 Language */}
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-bold text-green-900 text-lg">{feedback.ao2?.band || 'Band'}</h4>
                    <p className="text-sm text-green-700 font-semibold">{feedback.ao2?.score || 'Score'}</p>
                    <p className="text-xs text-green-600 mt-1">AO2: Language</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-green-900 mb-2">✓ Strengths:</p>
                    <ul className="text-xs text-green-800 space-y-1">
                      {feedback.ao2?.strengths?.map((s: string, i: number) => (
                        <li key={i} className="ml-2">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-orange-900 mb-2">→ Improvements:</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {feedback.ao2?.improvements?.map((imp: string, i: number) => (
                        <li key={i} className="ml-2">• {imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* AO3 Structure */}
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-bold text-purple-900 text-lg">{feedback.ao3?.band || 'Band'}</h4>
                    <p className="text-sm text-purple-700 font-semibold">{feedback.ao3?.score || 'Score'}</p>
                    <p className="text-xs text-purple-600 mt-1">AO3: Structure</p>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-purple-900 mb-2">✓ Strengths:</p>
                    <ul className="text-xs text-purple-800 space-y-1">
                      {feedback.ao3?.strengths?.map((s: string, i: number) => (
                        <li key={i} className="ml-2">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-orange-900 mb-2">→ Improvements:</p>
                    <ul className="text-xs text-orange-800 space-y-1">
                      {feedback.ao3?.improvements?.map((imp: string, i: number) => (
                        <li key={i} className="ml-2">• {imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              {feedback.overall && (
                <div className="bg-gray-900 text-white rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-300">Total Score</p>
                    <p className="text-2xl font-bold">{feedback.overall.total || '0/50'}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-300">Grade</p>
                    <p className="text-3xl font-bold text-blue-400">{feedback.overall.grade || '-'}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-300">🎯 Top Priority</p>
                    <p className="text-xs text-red-400">{feedback.overall.topFix || 'N/A'}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-300">⭐ Top Strength</p>
                    <p className="text-xs text-green-400">{feedback.overall.topStrength || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {essay.notes && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">NOTES</h3>
            <p className="text-gray-700">{essay.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
