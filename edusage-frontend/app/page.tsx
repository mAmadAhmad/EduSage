import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
      <h1 className="text-5xl font-extrabold text-gray-800">Welcome to EduSage</h1>
      <p className="mt-4 text-lg text-gray-600 max-w-2xl">
        Your AI-powered assistant for creating engaging quizzes, generating insightful lesson plans, and streamlining your teaching workflow.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/quiz-workspace" className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700">
          Go to Quiz Workspace
        </Link>
        <Link href="/slide-workspace" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">
          Go to Slide Workspace
        </Link>
      </div>
    </main>
  );
}