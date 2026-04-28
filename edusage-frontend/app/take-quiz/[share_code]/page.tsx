import QuizInterface from './QuizInterface';

interface PublicQuiz {
  id: number;
  title: string;
  instructions: string | null;
  questions: any[];
}

/**
 * Server-side data fetching for the public quiz.
 * Bypasses CORS and client-side load times by hydrating the component directly.
 */
async function getQuizByShareCode(share_code: string): Promise<PublicQuiz | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/take-quiz/${share_code}`, {
      cache: 'no-store',
      credentials: 'include'
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return null;
  }
}

/**
 * TakeQuiz Server Component
 * * Validates the share code against the backend. If valid, renders the interactive
 * QuizInterface. If invalid, renders a standard 404/Not Found view.
 */
export default async function TakeQuizPage({ params: { share_code } }: { params: { share_code: string } }) {
  const quiz = await getQuizByShareCode(share_code);

  if (!quiz) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
        <p className="text-gray-500">The share code may be invalid, or the instructor has closed this session.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
      <QuizInterface initialQuiz={quiz} />
    </main>
  );
}