'use client';
import { useRouter } from 'next/navigation';

export default function LessonPlanActions({ lessonPlanId }: { lessonPlanId: number }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;

    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/content/lesson-plans/${lessonPlanId}`, {
          method: 'DELETE',
          credentials: 'include'
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error('Unauthorized. Please log in again.');
        throw new Error('Failed to delete lesson plan');
      }
      
      router.refresh();
    } catch (error) {
       alert(error instanceof Error ? error.message : 'Could not delete the lesson plan.');
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