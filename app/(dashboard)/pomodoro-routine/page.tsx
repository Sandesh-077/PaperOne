'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}

export default function PomodoroRoutinePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [morningChecklist, setMorningChecklist] = useState<ChecklistItem[]>([
    { id: 'snooze', label: 'Wake without snoozing alarm', completed: false },
    { id: 'water1', label: 'Drink a glass of water', completed: false },
    { id: 'phone', label: 'Put phone away from reach', completed: false },
    { id: 'plan', label: '5-minute session plan', completed: false },
    { id: 'warmup', label: 'Warmup with easy questions', completed: false },
    { id: 'start', label: 'Start immediately (no scrolling)', completed: false }
  ])

  const [postLunchChecklist, setPostLunchChecklist] = useState<ChecklistItem[]>([
    { id: 'stand', label: 'Stand and stretch (2 min)', completed: false },
    { id: 'coldwater', label: 'Cold water splash on face', completed: false },
    { id: 'breathe', label: '3 deep breaths (box breathing)', completed: false },
    { id: 'water2', label: 'Drink water', completed: false },
    { id: 'clear', label: 'Clear desk of distractions', completed: false },
    { id: 'log', label: 'Open session log', completed: false },
    { id: 'timer', label: 'Set timer and commit', completed: false }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const toggleMorning = (id: string) => {
    setMorningChecklist(morningChecklist.map(item =>
      item.id === id ? {...item, completed: !item.completed} : item
    ))
  }

  const togglePostLunch = (id: string) => {
    setPostLunchChecklist(postLunchChecklist.map(item =>
      item.id === id ? {...item, completed: !item.completed} : item
    ))
  }

  const morningProgress = Math.round((morningChecklist.filter(i => i.completed).length / morningChecklist.length) * 100)
  const postLunchProgress = Math.round((postLunchChecklist.filter(i => i.completed).length / postLunchChecklist.length) * 100)

  if (status === 'loading') {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Pomodoro Routine</h1>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
        <h2 className="text-xl font-bold mb-4 text-center">Pomodoro Cycle</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-center">
          <div className="bg-white rounded p-3 shadow">
            <div className="text-2xl font-bold text-blue-600">50</div>
            <div className="text-xs text-gray-600">min Study</div>
          </div>
          <div className="flex items-center justify-center text-gray-400">→</div>
          <div className="bg-white rounded p-3 shadow">
            <div className="text-2xl font-bold text-green-600">10</div>
            <div className="text-xs text-gray-600">min Break</div>
          </div>
          <div className="flex items-center justify-center text-gray-400">→</div>
          <div className="bg-white rounded p-3 shadow">
            <div className="text-2xl font-bold text-blue-600">50</div>
            <div className="text-xs text-gray-600">min Study</div>
          </div>
          <div className="flex items-center justify-center text-gray-400">→</div>
        </div>
        <div className="flex justify-center mt-4">
          <div className="bg-white rounded p-3 shadow">
            <div className="text-2xl font-bold text-red-600">30</div>
            <div className="text-xs text-gray-600">min Long Break</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Morning Lock-In Routine */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-400">
          <div className="mb-4">
            <h2 className="text-xl font-bold">🌅 Morning Lock-In Routine</h2>
            <div className="mt-2 bg-orange-100 rounded-full h-2 w-full overflow-hidden">
              <div
                className="bg-orange-500 h-2 transition-all"
                style={{ width: `${morningProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">{morningProgress}% Complete</p>
          </div>

          <div className="space-y-2">
            {morningChecklist.map(item => (
              <label key={item.id} className="flex items-center p-2 hover:bg-orange-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleMorning(item.id)}
                  className="w-5 h-5 rounded text-orange-500 cursor-pointer"
                />
                <span className={`ml-3 ${item.completed ? 'line-through text-gray-400' : ''}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Post-Lunch Re-Lock-In Routine */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-400">
          <div className="mb-4">
            <h2 className="text-xl font-bold">🍽️ Post-Lunch Re-Lock-In</h2>
            <div className="mt-2 bg-pink-100 rounded-full h-2 w-full overflow-hidden">
              <div
                className="bg-pink-500 h-2 transition-all"
                style={{ width: `${postLunchProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">{postLunchProgress}% Complete</p>
          </div>

          <div className="space-y-2">
            {postLunchChecklist.map(item => (
              <label key={item.id} className="flex items-center p-2 hover:bg-pink-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => togglePostLunch(item.id)}
                  className="w-5 h-5 rounded text-pink-500 cursor-pointer"
                />
                <span className={`ml-3 ${item.completed ? 'line-through text-gray-400' : ''}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">💡 Routine Note</h3>
        <p className="text-sm text-blue-800">
          These checklists reset daily and are designed to help you maintain focus and consistency. They do not save any data—they are purely for your immediate session preparation.
        </p>
      </div>
    </div>
  )
}
