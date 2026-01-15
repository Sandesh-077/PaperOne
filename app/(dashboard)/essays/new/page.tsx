'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function NewEssayForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dailyTopic, setDailyTopic] = useState<{ category: string; prompt: string } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    prompt: '',
    content: '',
    grade: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Check if topic was passed via URL
    const topicParam = searchParams.get('topic')
    const customParam = searchParams.get('custom')
    
    if (topicParam) {
      setFormData(prev => ({
        ...prev,
        prompt: topicParam,
        title: topicParam
      }))
    } else if (!customParam) {
      // Fetch daily topic only if not custom
      fetch('/api/daily-topic')
        .then(res => res.json())
        .then(data => {
          setDailyTopic(data)
          setFormData(prev => ({
            ...prev,
            topic: data.category,
            prompt: data.prompt
          }))
        })
        .catch(console.error)
    }
  }, [searchParams])

  const getNewTopic = async () => {
    try {
      const res = await fetch('/api/daily-topic?type=random')
      const data = await res.json()
      setDailyTopic(data)
      setFormData(prev => ({
        ...prev,
        topic: data.category,
        prompt: data.prompt
      }))
    } catch (error) {
      console.error('Failed to get new topic:', error)
    }
  }

  const wordCount = formData.content.trim().split(/\s+/).filter(w => w.length > 0).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/essays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Log study session
        await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: ['essay'], duration: 0 })
        })
        
        router.push('/essays')
      }
    } catch (error) {
      console.error('Failed to create essay:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Write Essay</h1>
        <p className="text-gray-600 mt-1">Practice makes perfect</p>
      </div>

      {dailyTopic && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full mb-2">
                📚 Today&apos;s GP Topic: {dailyTopic.category}
              </span>
              <h3 className="text-xl font-semibold text-gray-900">{dailyTopic.prompt}</h3>
            </div>
            <button
              type="button"
              onClick={getNewTopic}
              className="px-3 py-1 text-sm bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
            >
              🎲 Different Topic
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Essay Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Enter a title for your essay"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Essay Content</label>
              <span className="text-sm font-medium text-gray-700">{wordCount} words</span>
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base leading-relaxed"
              placeholder="Start writing your essay here..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grade (optional)</label>
              <input
                type="text"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., A, B+, 85%"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Teacher feedback, areas to improve..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/essays')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Essay'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewEssayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <NewEssayForm />
    </Suspense>
  )
}
