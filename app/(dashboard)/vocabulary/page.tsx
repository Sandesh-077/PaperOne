'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Vocabulary {
  id: string
  word: string
  definition: string
  sentences: string[]
  learned: boolean
  category?: string
  createdAt: string
}

export default function VocabularyPage() {
  const router = useRouter()
  const { status } = useSession()
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    word: '',
    definition: '',
    sentences: [''],
    category: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchVocabulary()
    }
  }, [status, router])

  const fetchVocabulary = async () => {
    try {
      const response = await fetch('/api/vocabulary')
      if (response.ok) {
        const data = await response.json()
        setVocabulary(data)
      }
    } catch (error) {
      console.error('Failed to fetch vocabulary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ word: '', definition: '', sentences: [''], category: '' })
        setShowForm(false)
        fetchVocabulary()
      }
    } catch (error) {
      console.error('Failed to create vocabulary:', error)
    }
  }

  const toggleLearned = async (id: string, learned: boolean) => {
    try {
      await fetch(`/api/vocabulary/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learned: !learned })
      })
      fetchVocabulary()
    } catch (error) {
      console.error('Failed to update vocabulary:', error)
    }
  }

  const deleteVocab = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vocabulary?')) return
    
    try {
      await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
      fetchVocabulary()
    } catch (error) {
      console.error('Failed to delete vocabulary:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vocabulary</h1>
          <p className="text-gray-600 mt-1">Build your EGP vocabulary with context</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Word'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Add New Vocabulary</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Word</label>
              <input
                type="text"
                value={formData.word}
                onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Juxtaposition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Definition</label>
              <textarea
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Define the word..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Example Sentences</label>
              {formData.sentences.map((sentence, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={sentence}
                    onChange={(e) => {
                      const newSentences = [...formData.sentences]
                      newSentences[index] = e.target.value
                      setFormData({ ...formData, sentences: newSentences })
                    }}
                    required={index === 0}
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Use the word in a sentence..."
                  />
                  {formData.sentences.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSentences = formData.sentences.filter((_, i) => i !== index)
                        setFormData({ ...formData, sentences: newSentences })
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
                onClick={() => setFormData({ ...formData, sentences: [...formData.sentences, ''] })}
                className="text-sm text-green-600 hover:text-green-700"
              >
                + Add another sentence
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Academic, Formal"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Vocabulary
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {vocabulary.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No vocabulary yet. Start building your word bank!</p>
          </div>
        ) : (
          vocabulary.map((vocab) => (
            <div
              key={vocab.id}
              className={`bg-white p-6 rounded-lg shadow-sm border ${
                vocab.learned ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{vocab.word}</h3>
                    {vocab.category && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {vocab.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{vocab.definition}</p>
                  {vocab.sentences && vocab.sentences.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {vocab.sentences.map((sentence, idx) => (
                        <p key={idx} className="text-gray-600 italic text-sm ml-4">• &ldquo;{sentence}&rdquo;</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleLearned(vocab.id, vocab.learned)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      vocab.learned
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {vocab.learned ? '✓ Learned' : 'Mark Learned'}
                  </button>
                  <button
                    onClick={() => deleteVocab(vocab.id)}
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
