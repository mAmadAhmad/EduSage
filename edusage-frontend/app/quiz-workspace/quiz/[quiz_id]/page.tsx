'use client';

import { useState, useEffect } from 'react';
import QuizEditorForm from './QuizEditorForm';

interface Question { id?: number; question_text: string; options: string[] | null; correct_answer: string; question_type: string; }
// NEW: Added time_limit_minutes
interface Quiz { id: number; title: string; instructions: string | null; time_limit_minutes: number | null; questions: Question[]; }

/**
 * QuizEditorPage Component
 * Server-side wrapper that fetches the quiz data and passes it to the interactive editor form.
 * @param {Object} params - URL parameters containing the quiz_id.
 */
export default function QuizEditorPage({ params }: { params: { quiz_id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/quizzes/${params.quiz_id}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized access. Please log in.');
          throw new Error(`Failed to fetch quiz.`);
        }
        setQuiz(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [params.quiz_id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error) return <p className="text-center mt-20 text-red-500 font-medium">Error: {error}</p>;
  if (!quiz) return <p className="text-center mt-20 text-gray-500">Quiz not found.</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-50">
      <QuizEditorForm initialQuiz={quiz} />
    </main>
  );
}