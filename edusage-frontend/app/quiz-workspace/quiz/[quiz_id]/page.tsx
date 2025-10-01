// app/dashboard/quiz/[quiz_id]/page.tsx

// Import our new client component
import QuizEditorForm from './QuizEditorForm';

interface Quiz {
  id: number;
  title: string;
  instructions: string | null;
  questions: any[]; // Simple type for the server component
}

// This function fetches a SINGLE quiz by its ID
async function getQuizById(quiz_id: string): Promise<Quiz | null> {
  try {
    // IMPORTANT: Use the full URL here because this runs on the server
    const res = await fetch(`http://127.0.0.1:8000/api/v1/quizzes/${quiz_id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch quiz. Status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return null;
  }
}

// This is our Server Component page
export default async function QuizEditorPage({ params: { quiz_id } }: { params: { quiz_id: string } }) {
  const quiz = await getQuizById(quiz_id);

  if (!quiz) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-2xl font-bold">Quiz not found.</h1>
        <p className="text-gray-500">Could not load quiz with ID: {quiz_id}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      {/* We render our interactive client component and pass the quiz data to it */}
      <QuizEditorForm initialQuiz={quiz} />
    </main>
  );
}
