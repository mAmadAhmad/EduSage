'use client'; // Make it a Client Component

import { useState, useEffect } from 'react';
import LessonPlanInterface from './LessonPlanInterface';

// Keep the interface
interface Slide { title: string; bullet_points: string[]; speaker_notes: string; }
interface LessonPlan { id: number; lesson_title: string; learning_objectives: string[]; key_concepts: string[]; slides: Slide[]; }


export default function LessonPlanPage({ params }: { params: { lessonPlanId: string } }) {
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLessonPlan = async () => {
             
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const res = await fetch(`${backendUrl}/content/lesson-plans/${params.lessonPlanId}`, {
                    cache: 'no-store',
                    credentials: 'include'
                });
                if (!res.ok) {
                    if (res.status === 401) throw new Error('Unauthorized');
                    throw new Error('Failed to fetch lesson plan');
                }
                setLessonPlan(await res.json());
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Failed to load lesson plan');
            } finally {
                setLoading(false);
            }
        };
        fetchLessonPlan();
    }, [params.lessonPlanId]);


    if (loading) return <p className="text-center mt-20">Loading Lesson Plan...</p>;
    if (error) return <p className="text-center mt-20 text-red-500">Error: {error}</p>;
    if (!lessonPlan) return <p className="text-center mt-20">Lesson Plan Not Found</p>;

    return (
        <main className="flex min-h-screen flex-col items-center p-12 bg-gray-100">
            <LessonPlanInterface initialLessonPlan={lessonPlan} />
        </main>
    );
}