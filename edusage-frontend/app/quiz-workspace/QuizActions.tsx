'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Trash2, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function QuizActions({ quizId }: { quizId: number }) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quiz? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/${quizId}`, {
          method: 'DELETE',
          credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
    } catch (error) {
      alert('Could not delete the quiz.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/${quizId}/share`, {
          method: 'POST',
          credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to share');
      const data = await res.json();
      // Use the modern clipboard API
      await navigator.clipboard.writeText(data.share_code);
      alert(`Code copied to clipboard: ${data.share_code}`);
    } catch (error) {
       alert('Could not generate a share code.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-auto">
      {/* Submissions Button */}
      <Link 
        href={`/quiz-workspace/quiz/${quizId}/submissions`} 
        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
        title="View Submissions"
      >
        <FileText size={16} className="text-gray-500 group-hover:text-blue-600" />
        <span className="group-hover:text-blue-700">Results</span>
      </Link>

      {/* Share Button */}
      <button 
        onClick={handleShare} 
        disabled={isSharing}
        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        title="Share Quiz"
      >
        {isSharing ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />}
      </button>

      {/* Delete Button */}
      <button 
        onClick={handleDelete} 
        disabled={isDeleting}
        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title="Delete Quiz"
      >
        {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18} />}
      </button>
    </div>
  );
}