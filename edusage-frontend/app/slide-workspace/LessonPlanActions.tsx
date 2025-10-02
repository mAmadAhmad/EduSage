'use client';
import { useRouter } from 'next/navigation';

export function LessonPlanActions({ lessonPlanId }: { lessonPlanId: number }) {
  const router = useRouter();

  const handleDelete = async () => {
    // A simple confirmation dialog
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/content/lesson-plans/${lessonPlanId}`, { method: 'DELETE' });
      
      if (!res.ok) throw new Error('Failed to delete lesson plan');
      
      // Refresh the page to update the list of lesson plans
      router.refresh(); 
    } catch (error) {
      alert('Could not delete the lesson plan.');
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleDelete} className="text-sm font-semibold text-red-600 hover:underline">
        Delete
      </button>
    </div>
  );
}