'use client';

import { useState, FormEvent, Fragment } from 'react';
import { Trash2, Plus, Save, ArrowLeft, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';

interface Question { id?: number; question_text: string; options: string[] | null; correct_answer: string; question_type: string; }
interface Quiz { id: number; title: string; instructions: string | null; questions: Question[]; }

/**
 * QuizEditorForm Component
 * * Interactive form for editing quiz metadata and questions. Handles dynamic question
 * addition, deletion, and robust state management before syncing with the backend.
 * * @param {Quiz} initialQuiz - The hydrated quiz object passed down from the parent page.
 */
export default function QuizEditorForm({ initialQuiz }: { initialQuiz: Quiz }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isSaving, setIsSaving] = useState(false);
  
  // UI State for Modals and Toasts
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const triggerToast = (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3000);
  };

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setIsSaving(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/${quiz.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: quiz.title,
            instructions: quiz.instructions,
            questions: quiz.questions,
        }),
      });
      if (!res.ok) throw new Error('Failed to save changes');
      
      triggerToast('success', 'Quiz saved successfully!');
    } catch (err) {
      triggerToast('error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuizChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuiz({ ...quiz, [e.target.name]: e.target.value });
  };
  
  const handleQuestionChange = (qIndex: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...quiz.questions];
    (updatedQuestions[qIndex] as any)[field] = value;
    setQuiz({ ...quiz, questions: updatedQuestions });
  };
  
  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
      const updatedQuestions = [...quiz.questions];
      if (updatedQuestions[qIndex].options) {
          updatedQuestions[qIndex].options![oIndex] = value;
          setQuiz({ ...quiz, questions: updatedQuestions });
      }
  };
  
  const addQuestion = (type: 'MCQ' | 'Short Answer') => {
    const newQuestion: Question = {
      question_text: '',
      question_type: type,
      options: type === 'MCQ' ? ['', '', '', ''] : null,
      correct_answer: '',
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };
  
  const confirmDeleteQuestion = () => {
    if (deleteIndex === null) return;
    const updatedQuestions = quiz.questions.filter((_, index) => index !== deleteIndex);
    setQuiz({ ...quiz, questions: updatedQuestions });
    setDeleteIndex(null); // Close modal
  };

  return (
    <div className="w-full max-w-5xl relative">
      
      {/* Fixed Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-gray-50/95 backdrop-blur py-4 z-10 border-b border-gray-200">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium">
            <ArrowLeft size={18} /> Back
        </button>
        <div className="flex gap-3">
             <button 
                onClick={handleSaveChanges} 
                disabled={isSaving} 
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
             >
                <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
             </button>
        </div>
      </div>

      <form onSubmit={handleSaveChanges} className="space-y-8 pb-20">
        
        {/* Quiz Meta Card */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <input
                name="title"
                value={quiz.title}
                onChange={handleQuizChange}
                placeholder="Quiz Title"
                className="text-3xl font-bold text-gray-900 w-full bg-transparent focus:outline-none placeholder-gray-300"
            />
            <textarea
                name="instructions"
                value={quiz.instructions || ''}
                onChange={handleQuizChange}
                rows={2}
                className="text-base text-gray-600 mt-4 w-full bg-transparent focus:outline-none resize-none placeholder-gray-400"
                placeholder="Add instructions for your students..."
            />
        </div>

        {/* Questions List */}
        <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => (
            <div key={qIndex} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 group hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 font-bold rounded-lg text-sm">
                            {qIndex + 1}
                        </span>
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-semibold uppercase rounded tracking-wide border border-gray-100">
                            {question.question_type}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setDeleteIndex(qIndex)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Delete Question"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <textarea
                    value={question.question_text}
                    onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-lg"
                    rows={2}
                    placeholder="Enter question text..."
                />
                
                <div className="mt-6 pl-4 border-l-2 border-gray-100">
                    {question.question_type === 'MCQ' && question.options ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Options</label>
                                {question.options?.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-400">
                                            {String.fromCharCode(65 + oIndex)}
                                        </div>
                                        <input
                                            value={option}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                            className="flex-1 p-2 border border-gray-200 rounded-md text-sm text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder={`Option ${oIndex + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Correct Answer</label>
                                <select
                                    value={question.correct_answer}
                                    onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg bg-green-50/50 text-green-800 font-medium focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="" disabled>Select correct option</option>
                                    {question.options?.map((option, oIndex) => (
                                        <option key={oIndex} value={option}>
                                            {option || `Option ${oIndex + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Model Answer</label>
                            <textarea
                                value={question.correct_answer}
                                onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                                className="w-full p-3 border border-green-200 rounded-lg bg-green-50/30 text-gray-800 focus:ring-green-500 focus:border-green-500"
                                rows={2}
                                placeholder="Enter the ideal answer here (for AI grading reference)..."
                            />
                        </div>
                    )}
                </div>
            </div>
            ))}
        </div>
        
        <div className="flex justify-center gap-4 py-8 border-t border-dashed border-gray-300 mt-8">
            <button type="button" onClick={() => addQuestion('MCQ')} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all">
                <Plus size={18} /> Add Multiple Choice
            </button>
            <button type="button" onClick={() => addQuestion('Short Answer')} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 shadow-sm text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all">
                <Plus size={18} /> Add Short Answer
            </button>
        </div>

      </form>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Transition appear show={deleteIndex !== null} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setDeleteIndex(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">Delete Question</Dialog.Title>
                    <p className="text-sm text-gray-500">Are you sure you want to remove this question from the quiz?</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setDeleteIndex(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="button" onClick={confirmDeleteQuestion}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 flex items-center gap-2">
                    <Trash2 size={16} /> Yes, delete
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
}