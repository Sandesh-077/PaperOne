'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface ErrorLog {
  id: string
  category: string
  description: string
  correction: string
  context?: string
  resolved: boolean
  createdAt: string
}

export default function ErrorsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month'>('all')
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    correction: '',
    context: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchErrors()
    }
  }, [status, router])

  const fetchErrors = async () => {
    try {
      const response = await fetch('/api/errors')
      if (response.ok) {
        const data = await response.json()
        setErrors(data)
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ category: '', description: '', correction: '', context: '' })
        setShowForm(false)
        fetchErrors()
      }
    } catch (error) {
      console.error('Failed to create error log:', error)
    }
  }

  const toggleResolved = async (id: string, resolved: boolean) => {
    try {
      await fetch(`/api/errors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved })
      })
      fetchErrors()
    } catch (error) {
      console.error('Failed to update error:', error)
    }
  }

  const deleteError = async (id: string) => {
    if (!confirm('Are you sure you want to delete this error log?')) return
    
    try {
      await fetch(`/api/errors/${id}`, { method: 'DELETE' })
      fetchErrors()
    } catch (error) {
      console.error('Failed to delete error:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const categories = ['Grammar', 'Spelling', 'Punctuation', 'Style', 'Structure', 'Logic', 'Vocabulary misuse', 'Weak argument', 'Other']

  // Filter errors by time period
  const getFilteredErrors = () => {
    const now = new Date()
    if (timeFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return errors.filter(e => new Date(e.createdAt) >= weekAgo)
    } else if (timeFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return errors.filter(e => new Date(e.createdAt) >= monthAgo)
    }
    return errors
  }

  const filteredErrors = getFilteredErrors()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Error Log</h1>
          <p className="text-gray-600 mt-1">Track and learn from your mistakes</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeFilter === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeFilter === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Log Error'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Log New Error</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Error Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="What was the mistake?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correction</label>
              <textarea
                value={formData.correction}
                onChange={(e) => setFormData({ ...formData, correction: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="How should it be corrected?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context (optional)</label>
              <input
                type="text"
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Where did this error occur?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Log Error
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredErrors.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">
              {errors.length === 0 
                ? "No errors logged yet. Learn from your mistakes!" 
                : `No errors found for ${timeFilter === 'week' ? 'this week' : 'this month'}`}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Showing {filteredErrors.length} of {errors.length} errors
            </p>
            {filteredErrors.map((error) => (
              <div
                key={error.id}
                className={`bg-white p-6 rounded-lg shadow-sm border ${
                  error.resolved ? 'border-green-200 bg-green-50' : 'border-red-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        {error.category}
                      </span>
                      {error.context && (
                        <span className="text-sm text-gray-500">• {error.context}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">❌ Error:</p>
                        <p className="text-gray-900 ml-6">{error.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">✓ Correction:</p>
                        <p className="text-gray-900 ml-6">{error.correction}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleResolved(error.id, error.resolved)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        error.resolved
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {error.resolved ? '✓ Resolved' : 'Mark Resolved'}
                    </button>
                    <button
                      onClick={() => deleteError(error.id)}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
