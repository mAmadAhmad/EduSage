// app/dashboard/QuizActions.tsx
'use client';
import { useRouter } from 'next/navigation';

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
    <div className="flex gap-2">
      <button onClick={handleShare} className="text-sm text-blue-600 hover:underline">Share</button>
      <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete</button>
    </div>
  );
}