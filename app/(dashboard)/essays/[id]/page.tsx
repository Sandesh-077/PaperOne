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
  createdAt: string
}

export default function ViewEssayPage() {
  const router = useRouter()
  const params = useParams()
  const [essay, setEssay] = useState<Essay | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
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
          content: data.content,
          grade: data.grade || '',
          notes: data.notes || ''
        })
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

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
