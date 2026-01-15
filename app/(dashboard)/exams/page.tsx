"use client";

import { useEffect, useState } from "react";

type Exam = {
  id: string;
  name: string;
  examDate: string;
  board: string;
  subjectId: string;
  subject: {
    name: string;
    color: string;
  };
  daysRemaining: number;
  createdAt: string;
};

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string; color: string }>>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    examDate: "",
    board: "",
    subjectId: "",
  });

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exams");
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.examDate || !formData.board || !formData.subjectId) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ name: "", examDate: "", board: "", subjectId: "" });
        fetchExams();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create exam");
      }
    } catch (error) {
      console.error("Failed to create exam:", error);
      alert("Failed to create exam");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchExams();
      } else {
        alert("Failed to delete exam");
      }
    } catch (error) {
      console.error("Failed to delete exam:", error);
      alert("Failed to delete exam");
    }
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining < 0) return "text-gray-500";
    if (daysRemaining <= 7) return "text-red-600 font-bold";
    if (daysRemaining <= 14) return "text-orange-600 font-semibold";
    if (daysRemaining <= 30) return "text-yellow-600";
    return "text-green-600";
  };

  const getUrgencyBg = (daysRemaining: number) => {
    if (daysRemaining < 0) return "bg-gray-100 border-gray-300";
    if (daysRemaining <= 7) return "bg-red-50 border-red-300";
    if (daysRemaining <= 14) return "bg-orange-50 border-orange-300";
    if (daysRemaining <= 30) return "bg-yellow-50 border-yellow-300";
    return "bg-green-50 border-green-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Sort exams by date (upcoming first)
  const sortedExams = [...exams].sort((a, b) => {
    return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
  });

  const upcomingExams = sortedExams.filter(e => e.daysRemaining >= 0);
  const pastExams = sortedExams.filter(e => e.daysRemaining < 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Tracker</h1>
          <p className="text-gray-600 mt-1">Track your upcoming A-Level exams</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Exam"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Add New Exam</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Physics AS Paper 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board
                </label>
                <input
                  type="text"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  placeholder="e.g., CIE, Edexcel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add Exam
            </button>
          </form>
        </div>
      )}

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Exams</h2>
          <div className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${getUrgencyBg(exam.daysRemaining)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{exam.name}</h3>
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          backgroundColor: exam.subject.color + "20",
                          color: exam.subject.color,
                        }}
                      >
                        {exam.subject.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📅 {formatDate(exam.examDate)}</span>
                      <span>📋 {exam.board}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getUrgencyColor(exam.daysRemaining)}`}>
                        {exam.daysRemaining}
                      </div>
                      <div className="text-sm text-gray-600">
                        {exam.daysRemaining === 1 ? "day" : "days"} left
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded transition-colors"
                      title="Delete exam"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Exams */}
      {pastExams.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-500 mb-4">Past Exams</h2>
          <div className="space-y-3 opacity-60">
            {pastExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-gray-100 border border-gray-300 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-700">{exam.name}</h3>
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          backgroundColor: exam.subject.color + "20",
                          color: exam.subject.color,
                        }}
                      >
                        {exam.subject.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 {formatDate(exam.examDate)}</span>
                      <span>📋 {exam.board}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="text-gray-500 hover:text-red-600 hover:bg-red-100 p-2 rounded transition-colors"
                    title="Delete exam"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No exams yet</h3>
          <p className="text-gray-600 mb-4">Add your first exam to start tracking</p>
        </div>
      )}
    </div>
  );
}
