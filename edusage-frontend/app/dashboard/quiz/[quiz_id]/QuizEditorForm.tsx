'use client';

import { useState, FormEvent } from 'react';

// ... (your interfaces for Question and Quiz are the same)
interface Question {
  id?: number;
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  question_type: string;
}
interface Quiz {
  id: number;
  title: string;
  instructions: string | null;
  questions: Question[];
}


export default function QuizEditorForm({ initialQuiz }: { initialQuiz: Quiz }) {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [isSaving, setIsSaving] = useState(false);

  // ... (handleSaveChanges, handleQuizChange, handleQuestionChange, handleOptionChange functions are the same)
  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    setIsSaving(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: quiz.title,
            instructions: quiz.instructions,
            questions: quiz.questions,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to save changes');
      }
      alert('Quiz saved successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
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


  return (
    <form onSubmit={handleSaveChanges} className="w-full max-w-4xl">
      <input
        name="title"
        value={quiz.title}
        onChange={handleQuizChange}
        className="text-4xl font-bold text-gray-800 w-full border-b pb-4 bg-transparent focus:outline-none focus:border-blue-500"
      />
      <textarea
        name="instructions"
        value={quiz.instructions || ''}
        onChange={handleQuizChange}
        className="text-lg text-gray-600 mt-4 w-full p-2 border rounded bg-transparent focus:outline-none focus:border-blue-400"
        placeholder="Quiz Instructions..."
      />
      <div className="mt-10 space-y-8">
        {quiz.questions.map((question, qIndex) => (
          <div key={qIndex} className="bg-white p-6 rounded-lg shadow-md border space-y-4">
            <div>
              <label className="font-semibold text-lg text-gray-800">
                Question {qIndex + 1}
              </label>
              <textarea
                value={question.question_text}
                onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                className="w-full mt-2 p-2 border rounded bg-white text-gray-900"
                rows={3}
              />
            </div>

            {/* --- START: CONDITIONAL RENDERING LOGIC --- */}
            {question.question_type === 'MCQ' ? (
              <>
                {/* --- Fields for MCQ Questions --- */}
                <div>
                  <label className="font-semibold text-gray-700">Options</label>
                  <div className="space-y-2 mt-2">
                    {question.options?.map((option, oIndex) => (
                      <input
                        key={oIndex}
                        value={option}
                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                        className="w-full p-2 border rounded bg-white text-gray-900" // STYLING FIX
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">Correct Answer</label>
                  <select
                    value={question.correct_answer}
                    onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                    className="w-full mt-2 p-2 border rounded bg-white text-gray-900" // STYLING FIX
                  >
                    {question.options?.map((option, oIndex) => (
                      <option key={oIndex} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* --- Fields for Short Answer / Other Question Types --- */}
                <div>
                  <label className="font-semibold text-gray-700">Correct Answer</label>
                  <textarea
                    value={question.correct_answer}
                    onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                    className="w-full mt-2 p-2 border rounded bg-white text-gray-900"
                    rows={2}
                    placeholder="Enter the correct answer..."
                  />
                </div>
              </>
            )}
            {/* --- END: CONDITIONAL RENDERING LOGIC --- */}

          </div>
        ))}
      </div>
      <div className="mt-10 flex justify-end">
        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}