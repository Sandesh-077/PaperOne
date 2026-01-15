'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface GrammarRule {
  id: string
  title: string
  explanation: string
  examples: string[]
  status: 'understood' | 'needs_work'
  category?: string
  createdAt: string
}

export default function GrammarPage() {
  const router = useRouter()
  const { status } = useSession()
  const [rules, setRules] = useState<GrammarRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    explanation: '',
    examples: [''],
    category: '',
    status: 'needs_work' as 'understood' | 'needs_work'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchRules()
    }
  }, [status, router])

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/grammar')
      if (response.ok) {
        const data = await response.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Failed to fetch grammar rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ title: '', explanation: '', examples: [''], category: '', status: 'needs_work' })
        setShowForm(false)
        fetchRules()
      }
    } catch (error) {
      console.error('Failed to create grammar rule:', error)
    }
  }

  const toggleStatus = async (id: string, currentStatus: 'understood' | 'needs_work') => {
    const newStatus = currentStatus === 'understood' ? 'needs_work' : 'understood'
    try {
      await fetch(`/api/grammar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      fetchRules()
    } catch (error) {
      console.error('Failed to update grammar rule:', error)
    }
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grammar rule?')) return
    
    try {
      await fetch(`/api/grammar/${id}`, { method: 'DELETE' })
      fetchRules()
    } catch (error) {
      console.error('Failed to delete grammar rule:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grammar Rules</h1>
          <p className="text-gray-600 mt-1">Master essential grammar for EGP</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Rule'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New Grammar Rule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Subject-Verb Agreement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Explain the grammar rule..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Examples</label>
              {formData.examples.map((example, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={example}
                    onChange={(e) => {
                      const newExamples = [...formData.examples]
                      newExamples[index] = e.target.value
                      setFormData({ ...formData, examples: newExamples })
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide an example sentence..."
                  />
                  {formData.examples.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newExamples = formData.examples.filter((_, i) => i !== index)
                        setFormData({ ...formData, examples: newExamples })
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
                onClick={() => setFormData({ ...formData, examples: [...formData.examples, ''] })}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add another example
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Syntax, Punctuation"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Grammar Rule
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No grammar rules yet. Add your first one!</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white p-6 rounded-lg shadow-sm border ${
                rule.status === 'understood' ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.title}</h3>
                    {rule.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {rule.category}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      rule.status === 'understood' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {rule.status === 'understood' ? '✓ Understood' : '⚠ Needs Work'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{rule.explanation}</p>
                  {rule.examples && rule.examples.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-gray-700">Examples:</p>
                      {rule.examples.map((example, idx) => (
                        <p key={idx} className="text-gray-600 italic text-sm ml-4">• {example}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleStatus(rule.id, rule.status)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      rule.status === 'understood'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'
                    }`}
                  >
                    {rule.status === 'understood' ? '✓ Understood' : 'Mark Understood'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
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
  )
}
