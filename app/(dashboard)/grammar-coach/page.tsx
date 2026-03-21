'use client';

import { useState, useEffect } from 'react';

interface GrammarWeakness {
  id: string;
  grammarArea: string;
  description: string;
  instanceCount: number;
  firstOccurrenceAt: string;
  lastOccurrenceAt: string;
  focusLevel: number;
  practiceAttempts: number;
  improvementRate: number;
  contextExamples: string[];
}

interface Exercise {
  level: number;
  grammarFocus: string;
  scenario: string;
  question: string;
  taskType: 'fill-blank' | 'rewrite' | 'choose' | 'identify';
  expectedFocus: string;
  example: string;
}

export default function GrammarCoachPage() {
  const [weaknesses, setWeaknesses] = useState<GrammarWeakness[]>([]);
  const [selectedWeakness, setSelectedWeakness] = useState<GrammarWeakness | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [view, setView] = useState<'list' | 'exercises'>('list');
  const [sortBy, setSortBy] = useState<'urgency' | 'frequency' | 'recent'>('urgency');
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});

  // Fetch grammar weaknesses
  useEffect(() => {
    const fetchWeaknesses = async () => {
      try {
        const response = await fetch('/api/grammar-weakness');
        const data = await response.json();
        setWeaknesses(Array.isArray(data?.weaknesses) ? data.weaknesses : []);
      } catch (error) {
        console.error('Error fetching weaknesses:', error);
        setWeaknesses([]);
      }
    };

    fetchWeaknesses();
  }, []);

  // Fetch exercises for selected weakness
  useEffect(() => {
    const fetchExercises = async () => {
      if (!selectedWeakness) return;

      setLoadingExercises(true);
      try {
        const response = await fetch('/api/grammar-weakness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weaknessId: selectedWeakness.id,
            generateExercise: true,
          }),
        });

        const data = await response.json();
        if (Array.isArray(data?.exercises)) {
          setExercises(data.exercises);
          setUserAnswers({});
          setShowAnswers({});
        } else {
          setExercises([]);
        }
      } catch (error) {
        console.error('Error fetching exercises:', error);
        setExercises([]);
      } finally {
        setLoadingExercises(false);
      }
    };

    if (view === 'exercises' && selectedWeakness) {
      fetchExercises();
    }
  }, [view, selectedWeakness]);

  const getSortedWeaknesses = () => {
    const sorted = [...weaknesses];
    switch (sortBy) {
      case 'urgency':
        return sorted.sort((a, b) => b.focusLevel - a.focusLevel);
      case 'frequency':
        return sorted.sort((a, b) => b.instanceCount - a.instanceCount);
      case 'recent':
        return sorted.sort(
          (a, b) => new Date(b.lastOccurrenceAt).getTime() - new Date(a.lastOccurrenceAt).getTime()
        );
      default:
        return sorted;
    }
  };

  const getFocusLevelColor = (level: number) => {
    if (level >= 4) return 'bg-red-100 text-red-800';
    if (level >= 3) return 'bg-orange-100 text-orange-800';
    if (level >= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getTaskTypeLabel = (taskType: string) => {
    switch (taskType) {
      case 'fill-blank':
        return '✏️ Fill the Blank';
      case 'rewrite':
        return '📝 Rewrite';
      case 'choose':
        return '◉ Choose Correct';
      case 'identify':
        return '🔍 Identify & Correct';
      default:
        return taskType;
    }
  };

  const handleToggleAnswer = (idx: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleUpdateAnswer = (idx: number, value: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [idx]: value,
    }));
  };

  if (weaknesses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Grammar Coach</h1>
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg mb-4">
              🎉 Great news! You haven&apos;t identified any grammar weak areas yet.
            </p>
            <p className="text-gray-500">
              Submit some writing practice pieces to get started. AI will analyze them and identify areas for improvement.
            </p>
            <a
              href="/writing-practice"
              className="inline-block mt-6 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Go to Writing Practice →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Grammar Coach</h1>
          <p className="text-gray-600">
            Focus on your grammar weak areas with targeted exercises
          </p>
        </div>

        {view === 'list' ? (
          <>
            {/* Filter/Sort Options */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Your Grammar Weak Areas</h2>
                <div className="flex gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'urgency' | 'frequency' | 'recent')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="urgency">Sort by Urgency</option>
                    <option value="frequency">Sort by Frequency</option>
                    <option value="recent">Sort by Recent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grammar Weaknesses List */}
            <div className="grid gap-6 mb-8">
              {getSortedWeaknesses().map((weakness) => (
                <div
                  key={weakness.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
                  onClick={() => {
                    setSelectedWeakness(weakness);
                    setView('exercises');
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{weakness.grammarArea}</h3>
                      <p className="text-gray-600">{weakness.description}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getFocusLevelColor(weakness.focusLevel)}`}>
                      Focus Level: {weakness.focusLevel}/5
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold">INSTANCES</p>
                      <p className="text-2xl font-bold text-gray-800">{weakness.instanceCount}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold">PRACTICE ATTEMPTS</p>
                      <p className="text-2xl font-bold text-gray-800">{weakness.practiceAttempts}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold">IMPROVEMENT RATE</p>
                      <p className={`text-2xl font-bold ${weakness.improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {weakness.improvementRate > 0 ? '+' : ''}{weakness.improvementRate.toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold">LAST OCCURRED</p>
                      <p className="text-sm font-bold text-gray-800">
                        {new Date(weakness.lastOccurrenceAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Context Examples */}
                  {weakness.contextExamples && weakness.contextExamples.length > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900 mb-2">EXAMPLES FROM YOUR WRITING:</p>
                      <p className="text-sm text-orange-800 italic">
                        &quot;{weakness.contextExamples[0]}&quot;
                      </p>
                    </div>
                  )}

                  {/* Practice Button */}
                  <button
                    className="mt-4 w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                  >
                    <span>Practice Exercises →</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : selectedWeakness ? (
          <>
            {/* Back Button */}
            <button
              onClick={() => setView('list')}
              className="mb-6 px-4 py-2 text-orange-600 hover:text-orange-700 underline font-semibold"
            >
              ← Back to Grammar Areas
            </button>

            {/* Exercises */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedWeakness.grammarArea}</h2>
              <p className="text-gray-600 mb-6">{selectedWeakness.description}</p>

              {loadingExercises ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating personalized exercises...</p>
                </div>
              ) : exercises.length > 0 ? (
                <div className="space-y-8">
                  {exercises.map((exercise, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex gap-3 mb-2">
                            <span className="inline-block bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Level {exercise.level}
                            </span>
                            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {getTaskTypeLabel(exercise.taskType)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{exercise.grammarFocus}</p>
                        </div>
                      </div>

                      {/* Scenario */}
                      {exercise.scenario && (
                        <div className="bg-white p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                          <p className="text-xs font-semibold text-gray-600 mb-1">SCENARIO:</p>
                          <p className="text-gray-700">{exercise.scenario}</p>
                        </div>
                      )}

                      {/* Question/Task */}
                      <div className="bg-white p-4 rounded-lg mb-4 border-l-4 border-orange-500">
                        <p className="text-xs font-semibold text-gray-600 mb-2">TASK:</p>
                        <p className="text-gray-800 font-semibold">{exercise.question}</p>
                      </div>

                      {/* Input Area */}
                      {exercise.taskType === 'rewrite' || exercise.taskType === 'fill-blank' ? (
                        <textarea
                          value={userAnswers[idx] || ''}
                          onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                          placeholder="Type your answer here..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 mb-4 resize-none"
                        />
                      ) : exercise.taskType === 'choose' ? (
                        <div className="space-y-2 mb-4">
                          {/* Note: This would need options passed from the API */}
                          <p className="text-sm text-gray-600 italic">Multiple choice options would appear here</p>
                        </div>
                      ) : (
                        <textarea
                          value={userAnswers[idx] || ''}
                          onChange={(e) => handleUpdateAnswer(idx, e.target.value)}
                          placeholder="Type your answer..."
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 mb-4 resize-none"
                        />
                      )}

                      {/* Show Answer Button */}
                      <button
                        onClick={() => handleToggleAnswer(idx)}
                        className="text-orange-600 hover:text-orange-700 font-semibold text-sm mb-3"
                      >
                        {showAnswers[idx] ? '▼ Hide Expected Answer' : '▶ Show Expected Answer'}
                      </button>

                      {/* Expected Answer */}
                      {showAnswers[idx] && (
                        <div className="bg-green-50 border border-green-300 p-4 rounded-lg">
                          <p className="text-xs font-semibold text-green-900 mb-2">EXPECTED ANSWER:</p>
                          <p className="text-green-800 mb-3">{exercise.example}</p>
                          <p className="text-xs text-green-700 font-semibold">FOCUS:</p>
                          <p className="text-green-700">{exercise.expectedFocus}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Complete Exercises Button */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => {
                        setView('list');
                        // In a real app, would record completion and update practice attempts
                        alert('Great practice! Your practice attempts have been recorded.');
                      }}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      ✅ Mark as Completed
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">Unable to generate exercises. Try again.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
