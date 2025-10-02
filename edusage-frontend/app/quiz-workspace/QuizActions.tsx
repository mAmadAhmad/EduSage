'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuizActions({ quizId }: { quizId: number }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/quizzes/${quizId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete quiz');
      router.refresh(); // Refresh the page to show the updated list
    } catch (error) {
      alert('Could not delete the quiz.');
    }
  };

  const handleShare = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/quizzes/${quizId}/share`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create share code');
      const data = await res.json();
      alert(`Quiz Share Code: ${data.share_code}`);
    } catch (error) {
      alert('Could not generate a share code.');
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* NEW: Add the Submissions link */}
      <Link href={`/quiz-workspace/quiz/${quizId}/submissions`} className="text-sm font-semibold text-green-600 hover:underline">
        Submissions
      </Link>
      <button onClick={handleShare} className="text-sm text-blue-600 hover:underline">Share</button>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete</button>
    </div>
  );
}