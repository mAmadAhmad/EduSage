// app/dashboard/quiz/[quiz_id]/submissions/page.tsx
import Link from 'next/link';

// Define types for our data
interface Answer {
  question_id: number;
  answer_text: string;
}
interface Submission {
  id: number;
  student_name: string;
  student_roll_no: string | null;
  answers: Answer[];
}

async function getSubmissions(quizId: string): Promise<Submission[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
    const res = await fetch(`${backendUrl}/quizzes/${quizId}/submissions`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch submissions');
    return res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function SubmissionsPage({ params: { quiz_id } }: { params: { quiz_id: string } }) {
  const submissions = await getSubmissions(quiz_id);

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
            <Link href="/quiz-workspace" className="text-blue-600 hover:underline">
                &larr; Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-800 mt-2">Quiz Submissions</h1>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <ul className="divide-y divide-gray-200">
            {submissions.length > 0 ? (
              submissions.map((submission) => (
                <li key={submission.id} className="py-4 flex justify-between items-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{submission.student_name}</p>
                    <p className="text-sm text-gray-500">{submission.student_roll_no || 'No Roll No.'}</p>
                  </div>
                  <p className="text-gray-600">{submission.answers.length} answers submitted</p>
                  {/* In the future, this button will lead to the grading view */}
                  <Link href={`/quiz-workspace/submissions/${submission.id}`} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700">
                View & Grade
                </Link>
                </li>
              ))
            ) : (
              <p className="text-gray-600 text-center py-4">No submissions for this quiz yet.</p>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}