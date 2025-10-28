'use client';

import { useState, useEffect } from 'react'; 
import Link from 'next/link';
import CreateQuizButton from './CreateQuizButton';
import AIQuizGenerator from './AIQuizGenerator';
import QuizActions from './QuizActions';


// Define a type for our Quiz data structure to match the backend
interface Question {
  id: number;
  question_text: string;
  // ... add other question fields if needed
}

interface Quiz {
  id: number;

  title: string;
  instructions: string | null;
  questions: Question[];
}

// This is an async Server Component, which is great for fetching data
async function getQuizzes(): Promise<Quiz[]> {
  try {
    // Fetch data from our FastAPI backend
    // IMPORTANT: Ensure your FastAPI server is running!
    const res = await fetch('http://127.0.0.1:8000/api/v1/quizzes/', {
      // This helps prevent caching issues during development
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch quizzes');
    }
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return []; // Return an empty array on error
  }
}

export default function DashboardPage() {
  // 3. Use state to hold quizzes and loading/error status
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4. Fetch data using useEffect on the client side
  useEffect(() => {
    const fetchQuizzes = async () => {
      // Retrieve the token from localStorage
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('You are not logged in.'); // Or redirect to login
        setLoading(false);
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/quizzes/`, {
          cache: 'no-store',
          // --- THE FIX: Add the Authorization header ---
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
           if (res.status === 401) throw new Error('Unauthorized. Please log in again.');
           throw new Error('Failed to fetch quizzes');
        }
        setQuizzes(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []); // Empty dependency array means this runs once on mount

  // 5. Render based on loading/error state
  if (loading) return <p className="text-center mt-10">Loading quizzes...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">Error: {error}</p>;

  // 6. The original JSX structure for displaying the dashboard
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className='flex justify-between items-center mb-8'>
          <h1 className="text-4xl font-bold text-gray-800">Quiz Workspace</h1>
          <div className="flex gap-4">
            <AIQuizGenerator />
            <CreateQuizButton />
          </div>
        </div>
        
        <div className="space-y-4">
          {quizzes.length > 0 ? (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white p-6 rounded-lg shadow-md border flex justify-between items-start">
                 <Link href={`/quiz-workspace/quiz/${quiz.id}`} className="block flex-grow mr-4">
                  <h2 className="text-2xl font-semibold text-blue-600 hover:text-blue-800">{quiz.title}</h2>
                  <p className="text-gray-600 mt-2">{quiz.instructions || 'No instructions provided.'}</p>
                   <p className="text-sm text-gray-500 mt-4">{quiz.questions.length} questions</p>
                </Link>
                <QuizActions quizId={quiz.id} />
              </div>
            ))
          ) : (
             <div className="bg-white p-6 rounded-lg shadow-md border text-center">
               <p className="text-gray-600">You haven't created any quizzes yet.</p>
             </div>
          )}
        </div>
      </div>
    </main>
  );
}