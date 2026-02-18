'use client';

import { useState, FormEvent } from 'react';
import { Trash2, Plus, Save, ArrowLeft, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Question { id?: number; question_text: string; options: string[] | null; correct_answer: string; question_type: string; }
interface Quiz { id: number; title: string; instructions: string | null; questions: Question[]; }

export default function QuizEditorForm({ initialQuiz }: { initialQuiz: Quiz }) {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

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
      alert('Quiz saved successfully!');
    } catch (err) {
      alert('Failed to save');
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
  
  const deleteQuestion = (qIndexToDelete: number) => {
    if (!confirm("Delete this question?")) return;
    const updatedQuestions = quiz.questions.filter((_, index) => index !== qIndexToDelete);
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  return (
    <div className="w-full max-w-5xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-gray-50/95 backdrop-blur py-4 z-10 border-b border-gray-200">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium">
            <ArrowLeft size={18} /> Back
        </button>
        <div className="flex gap-3">
             <button 
                onClick={handleSaveChanges} 
                disabled={isSaving} 
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
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
                        onClick={() => deleteQuestion(qIndex)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        title="Delete Question"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {/* Question Input */}
                <textarea
                    value={question.question_text}
                    onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-lg"
                    rows={2}
                    placeholder="Enter question text..."
                />
                
                {/* Options / Answer Area */}
                <div className="mt-6 pl-4 border-l-2 border-gray-100">
                    {question.question_type === 'MCQ' && question.options ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Options */}
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
                            
                            {/* Correct Answer Selector */}
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
        
        {/* Add Buttons */}
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
    </div>
  );
}