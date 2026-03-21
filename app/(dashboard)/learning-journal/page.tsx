'use client';

import { useState, useEffect } from 'react';

interface DailyWordWithProgress {
  id: string;
  word: string;
  definition: string;
  academicDefinition: string;
  category: string;
  difficulty: number;
  gpTip: string;
  commonMistakes: string;
  userProgress?: {
    status: 'learning' | 'learned' | 'needs_practice';
    confidenceLevel: number;
  };
}

interface LearningJournalEntry {
  id: string;
  wordId: string;
  meaningNoted: string;
  exampleSentences: string[];
  personalNotes: string;
  grammarRulesApplied: string[];
  areasOfConfusion: string;
  practiceScenarios: string[];
  createdAt: string;
  updatedAt: string;
}

export default function LearningJournalPage() {
  const [dailyWords, setDailyWords] = useState<DailyWordWithProgress[]>([]);
  const [selectedWord, setSelectedWord] = useState<DailyWordWithProgress | null>(null);
  const [journalEntry, setJournalEntry] = useState<LearningJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'edit' | 'view'>('edit');

  // Form state
  const [meaningNoted, setMeaningNoted] = useState('');
  const [exampleSentences, setExampleSentences] = useState<string[]>(['', '', '']);
  const [personalNotes, setPersonalNotes] = useState('');
  const [grammarRulesApplied, setGrammarRulesApplied] = useState<string[]>([]);
  const [grammarRuleInput, setGrammarRuleInput] = useState('');
  const [areasOfConfusion, setAreasOfConfusion] = useState('');
  const [practiceScenarios, setPracticeScenarios] = useState<string[]>(['']);
  const [scenarioInput, setScenarioInput] = useState('');

  // Fetch daily words
  useEffect(() => {
    const fetchDailyWords = async () => {
      try {
        const response = await fetch('/api/ai/daily-words');
        const data = await response.json();
        setDailyWords(data.words || []);
        if (data.words && data.words.length > 0) {
          setSelectedWord(data.words[0]);
        }
      } catch (error) {
        console.error('Error fetching daily words:', error);
      }
    };

    fetchDailyWords();
  }, []);

  // Fetch journal entry when word is selected
  useEffect(() => {
    const fetchJournalEntry = async () => {
      if (!selectedWord) return;

      try {
        const response = await fetch(`/api/learning-journal?wordId=${selectedWord.id}`);
        const data = await response.json();

        if (data.entries && data.entries.length > 0) {
          const entry = data.entries[0];
          setJournalEntry(entry);
          setMeaningNoted(entry.meaningNoted || '');
          setExampleSentences(entry.exampleSentences || ['', '', '']);
          setPersonalNotes(entry.personalNotes || '');
          setGrammarRulesApplied(entry.grammarRulesApplied || []);
          setAreasOfConfusion(entry.areasOfConfusion || '');
          setPracticeScenarios(entry.practiceScenarios || ['']);
        } else {
          // Reset form for new entry
          setJournalEntry(null);
          setMeaningNoted('');
          setExampleSentences(['', '', '']);
          setPersonalNotes('');
          setGrammarRulesApplied([]);
          setAreasOfConfusion('');
          setPracticeScenarios(['']);
        }
      } catch (error) {
        console.error('Error fetching journal entry:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedWord) {
      setLoading(true);
      fetchJournalEntry();
    }
  }, [selectedWord]);

  const handleAddGrammarRule = () => {
    if (grammarRuleInput.trim() && !grammarRulesApplied.includes(grammarRuleInput)) {
      setGrammarRulesApplied([...grammarRulesApplied, grammarRuleInput]);
      setGrammarRuleInput('');
    }
  };

  const handleRemoveGrammarRule = (rule: string) => {
    setGrammarRulesApplied(grammarRulesApplied.filter(r => r !== rule));
  };

  const handleAddScenario = () => {
    if (scenarioInput.trim()) {
      setPracticeScenarios([...practiceScenarios.filter(s => s), scenarioInput]);
      setScenarioInput('');
    }
  };

  const handleRemoveScenario = (idx: number) => {
    setPracticeScenarios(practiceScenarios.filter((_, i) => i !== idx));
  };

  const handleUpdateExampleSentence = (idx: number, value: string) => {
    const newSentences = [...exampleSentences];
    newSentences[idx] = value;
    setExampleSentences(newSentences);
  };

  const handleSaveJournal = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/learning-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: selectedWord?.id,
          meaningNoted,
          exampleSentences: exampleSentences.filter(s => s.trim()),
          personalNotes,
          grammarRulesApplied,
          areasOfConfusion,
          practiceScenarios: practiceScenarios.filter(s => s.trim()),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setJournalEntry(data.entry);
        alert('Journal entry saved successfully!');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      alert('Error saving journal entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJournal = async () => {
    if (!journalEntry) return;
    if (!confirm('Are you sure you want to delete this journal entry?')) return;

    try {
      const response = await fetch(`/api/learning-journal?id=${journalEntry.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setJournalEntry(null);
        setMeaningNoted('');
        setExampleSentences(['', '', '']);
        setPersonalNotes('');
        setGrammarRulesApplied([]);
        setAreasOfConfusion('');
        setPracticeScenarios(['']);
        alert('Journal entry deleted');
      }
    } catch (error) {
      console.error('Error deleting journal:', error);
    }
  };

  const getConfidenceStars = (level: number) => {
    return '⭐'.repeat(level) + '☆'.repeat(5 - level);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'learned':
        return 'bg-green-100 text-green-800';
      case 'learning':
        return 'bg-blue-100 text-blue-800';
      case 'needs_practice':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Learning Journal</h1>
          <p className="text-gray-600">
            Deepen your understanding of new vocabulary by reflecting on meaning, usage, and grammar patterns
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Daily Words */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Today&apos;s Words</h2>
              <div className="space-y-3">
                {dailyWords && Array.isArray(dailyWords) && dailyWords.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => setSelectedWord(word)}
                    className={`w-full text-left p-4 rounded-lg transition ${
                      selectedWord?.id === word.id
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-semibold">{word.word}</p>
                    <p className="text-xs opacity-75 mt-1">{word.category} • Level {word.difficulty}</p>
                    {word.userProgress && (
                      <p className="text-xs opacity-75 mt-1">{getConfidenceStars(word.userProgress.confidenceLevel)}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Journal Entry Form & Word Info */}
          <div className="col-span-2">
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : selectedWord ? (
              <>
                {/* Word Info Card */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">{selectedWord.word}</h2>
                      <p className="text-gray-600 mt-1">{selectedWord.definition}</p>
                    </div>
                    {selectedWord.userProgress && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedWord.userProgress.status)}`}>
                        {selectedWord.userProgress.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="font-semibold text-gray-800">Academic Definition:</p>
                      <p>{selectedWord.academicDefinition}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">📚 GP Tip:</p>
                      <p className="text-blue-700">{selectedWord.gpTip}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">⚠️ Common Mistakes:</p>
                      <p className="text-orange-700">{selectedWord.commonMistakes}</p>
                    </div>
                  </div>
                </div>

                {/* Journal Form */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex gap-2 mb-6 border-b">
                    <button
                      onClick={() => setTab('edit')}
                      className={`px-6 py-3 font-semibold border-b-2 transition ${
                        tab === 'edit'
                          ? 'text-purple-600 border-purple-600'
                          : 'text-gray-600 border-transparent hover:text-gray-800'
                      }`}
                    >
                      Edit Journal
                    </button>
                    {journalEntry && (
                      <button
                        onClick={() => setTab('view')}
                        className={`px-6 py-3 font-semibold border-b-2 transition ${
                          tab === 'view'
                            ? 'text-purple-600 border-purple-600'
                            : 'text-gray-600 border-transparent hover:text-gray-800'
                        }`}
                      >
                        View Entry
                      </button>
                    )}
                  </div>

                  {tab === 'edit' ? (
                    <div className="space-y-6">
                      {/* Meaning Noted */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Your Understanding <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Explain the word in your own words - what does it mean to you?
                        </p>
                        <textarea
                          value={meaningNoted}
                          onChange={(e) => setMeaningNoted(e.target.value)}
                          placeholder="e.g., Serendipity means finding something good by luck or chance..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                          required
                        />
                      </div>

                      {/* Example Sentences */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Example Sentences</label>
                        <p className="text-xs text-gray-500 mb-3">
                          Write 3 sentences using this word - force yourself to use it!
                        </p>
                        <div className="space-y-2">
                          {exampleSentences.map((sentence, idx) => (
                            <div key={idx}>
                              <label className="text-xs text-gray-600 block mb-1">Sentence {idx + 1}</label>
                              <textarea
                                value={sentence}
                                onChange={(e) => handleUpdateExampleSentence(idx, e.target.value)}
                                placeholder="Write a sentence using this word..."
                                rows={2}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Personal Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Personal Notes</label>
                        <p className="text-xs text-gray-500 mb-2">Mnemonics, memory tricks, or personal associations</p>
                        <textarea
                          value={personalNotes}
                          onChange={(e) => setPersonalNotes(e.target.value)}
                          placeholder="e.g., Remember &apos;serendipity&apos; with &apos;ser-en-dipity&apos; - found by dipping randomly"
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                        />
                      </div>

                      {/* Grammar Rules Applied */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Grammar Rules Applied</label>
                        <p className="text-xs text-gray-500 mb-2">
                          What grammar patterns does this word follow? (e.g., Can be adj/noun, takes object)
                        </p>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={grammarRuleInput}
                            onChange={(e) => setGrammarRuleInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddGrammarRule()}
                            placeholder="e.g., Noun + prepositional phrase, or Verb + infinitive"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddGrammarRule}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {grammarRulesApplied.map((rule) => (
                            <span
                              key={rule}
                              className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                            >
                              {rule}
                              <button
                                type="button"
                                onClick={() => handleRemoveGrammarRule(rule)}
                                className="text-purple-600 hover:text-purple-800 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Areas of Confusion */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Areas of Confusion</label>
                        <p className="text-xs text-gray-500 mb-2">What&apos;s confusing or tricky about this word?</p>
                        <textarea
                          value={areasOfConfusion}
                          onChange={(e) => setAreasOfConfusion(e.target.value)}
                          placeholder="e.g., Sounds similar to &apos;serene&apos; but different meaning..."
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                        />
                      </div>

                      {/* Practice Scenarios */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Practice Scenarios</label>
                        <p className="text-xs text-gray-500 mb-2">Where or when have you practiced using this word?</p>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={scenarioInput}
                            onChange={(e) => setScenarioInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddScenario()}
                            placeholder="e.g., Essay about luck in life"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddScenario}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                          >
                            Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {practiceScenarios
                            .filter(s => s.trim())
                            .map((scenario, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                              >
                                {scenario}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScenario(idx)}
                                  className="text-blue-600 hover:text-blue-800 font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={handleSaveJournal}
                          disabled={saving || !meaningNoted.trim()}
                          className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                        >
                          {saving ? 'Saving...' : 'Save Journal Entry'}
                        </button>
                        {journalEntry && (
                          <button
                            onClick={handleDeleteJournal}
                            className="px-6 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ) : journalEntry ? (
                    <div className="space-y-6">
                      {/* View Mode */}
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Your Understanding</h3>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{journalEntry.meaningNoted}</p>
                      </div>

                      {journalEntry.exampleSentences && journalEntry.exampleSentences.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-2">Example Sentences</h3>
                          <ul className="space-y-2">
                            {journalEntry.exampleSentences.map((sent, idx) => (
                              <li key={idx} className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">
                                {idx + 1}. {sent}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {journalEntry.personalNotes && (
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-2">Personal Notes</h3>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{journalEntry.personalNotes}</p>
                        </div>
                      )}

                      {journalEntry.grammarRulesApplied && journalEntry.grammarRulesApplied.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-2">Grammar Rules</h3>
                          <div className="flex flex-wrap gap-2">
                            {journalEntry.grammarRulesApplied.map((rule) => (
                              <span
                                key={rule}
                                className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {rule}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {journalEntry.areasOfConfusion && (
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-2">Areas of Confusion</h3>
                          <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{journalEntry.areasOfConfusion}</p>
                        </div>
                      )}

                      {journalEntry.practiceScenarios && journalEntry.practiceScenarios.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-2">Practice Scenarios</h3>
                          <div className="flex flex-wrap gap-2">
                            {journalEntry.practiceScenarios.map((scenario) => (
                              <span
                                key={scenario}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {scenario}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <button
                          onClick={() => setTab('edit')}
                          className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                        >
                          Edit Entry
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
