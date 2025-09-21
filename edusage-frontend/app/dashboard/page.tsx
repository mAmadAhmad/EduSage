// app/dashboard/page.tsx
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

export default async function DashboardPage() {
  const quizzes = await getQuizzes();

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className='flex justify-between items-center mb-8'>
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Teacher Dashboard</h1>
          <div className="flex gap-4">
            <CreateQuizButton />
            <AIQuizGenerator />
          </div>
          </div>
        <div className="space-y-4 mt-8">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex justify-between items-start">
                <Link href={`/dashboard/quiz/${quiz.id}`} className="block">
                  <h2 className="text-2xl font-semibold text-blue-600 hover:text-blue-800">{quiz.title}</h2>
                  <p className="text-gray-600 mt-2">{quiz.instructions || 'No instructions provided.'}</p>
                </Link>
                {/* USE THE NEW ACTIONS COMPONENT */}
                <QuizActions quizId={quiz.id} />
              </div>
              <p className="text-sm text-gray-500 mt-4">{quiz.questions.length} questions</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}