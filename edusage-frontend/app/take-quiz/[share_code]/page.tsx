// app/take-quiz/[share_code]/page.tsx

import QuizInterface from './QuizInterface';

interface PublicQuiz {
  id: number;
  title: string;
  instructions: string | null;
  questions: any[];
}

async function getQuizByShareCode(share_code: string): Promise<PublicQuiz | null> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const res = await fetch(`${backendUrl}/take-quiz/${share_code}`, {
      cache: 'no-store',
      credentials: 'include'
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || 'Failed to fetch quiz');
    }
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return null;
  }
}

// This is our Server Component page
export default async function TakeQuizPage({ params: { share_code } }: { params: { share_code: string } }) {
  const quiz = await getQuizByShareCode(share_code);

  if (!quiz) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-2xl font-bold">Quiz Not Found</h1>
        <p className="text-gray-500">The share code may be invalid or the quiz has been closed.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
      <QuizInterface initialQuiz={quiz} />
    </main>
  );
}