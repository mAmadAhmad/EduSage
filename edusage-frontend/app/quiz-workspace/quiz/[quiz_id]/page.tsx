'use client'; // Make it a Client Component

import { useState, useEffect } from 'react';
import QuizEditorForm from './QuizEditorForm';

// Keep the Quiz interface
interface Question { id?: number; question_text: string; options: string[] | null; correct_answer: string; question_type: string; }
interface Quiz { id: number; title: string; instructions: string | null; questions: Question[]; }

export default function QuizEditorPage({ params }: { params: { quiz_id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Not logged in.'); setLoading(false); return;
      }
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/quizzes/${params.quiz_id}`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized');
          throw new Error(`Failed to fetch quiz. Status: ${res.status}`);
        }
        setQuiz(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [params.quiz_id]); // Depend on quiz_id

  if (loading) return <p className="text-center mt-20">Loading Quiz Editor...</p>;
  if (error) return <p className="text-center mt-20 text-red-500">Error: {error}</p>;
  if (!quiz) return <p className="text-center mt-20">Quiz not found.</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <QuizEditorForm initialQuiz={quiz} />
    </main>
  );
}