'use client'; // Make it a Client Component

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AILessonPlanGenerator from "./AILessonPlanGenerator";
import LessonPlanActions from './LessonPlanActions';

// Keep the interface
interface LessonPlanInfo { id: number; lesson_title: string; }

export default function SlideWorkspacePage() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonPlans = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Not logged in.'); setLoading(false); return;
      }
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/content/lesson-plans/`, {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error('Unauthorized');
          throw new Error('Failed to fetch lesson plans');
        }
        setLessonPlans(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson plans');
      } finally {
        setLoading(false);
      }
    };
    fetchLessonPlans();
  }, []);

  if (loading) return <p className="text-center mt-20">Loading Lesson Plans...</p>;
  if (error) return <p className="text-center mt-20 text-red-500">Error: {error}</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className='flex justify-between items-center mb-8'>
          <h1 className="text-4xl font-bold text-gray-800">Slide Workspace</h1>
          <AILessonPlanGenerator />
        </div>
        
        <div className="space-y-4">
          {lessonPlans.length > 0 ? (
            lessonPlans.map((plan) => (
              <div key={plan.id} className="bg-white p-6 rounded-lg shadow-md border flex justify-between items-center">
                <Link href={`/slide-workspace/lesson-plans/${plan.id}`} className="block hover:underline flex-grow mr-4">
                  <h2 className="text-2xl font-semibold text-blue-600">{plan.lesson_title}</h2>
                </Link>
                <LessonPlanActions lessonPlanId={plan.id} />
              </div>
            ))
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md border text-center">
              <p className="text-gray-600">You haven't created any lesson plans yet.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}