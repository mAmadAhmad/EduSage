
import LessonPlanInterface from './LessonPlanInterface';

// Define the type for the data we fetch
interface LessonPlan {
    id: number;
    lesson_title: string;
    learning_objectives: string[];
    key_concepts: string[];
    slides: any[];
}

async function fetchLessonPlan(lessonPlanId: string): Promise<LessonPlan | null> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/content/lesson-plans/${lessonPlanId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch lesson plan');
        return res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function LessonPlanPage({ params: { lessonPlanId } }: { params: { lessonPlanId: string } }) {
    const lessonPlan = await fetchLessonPlan(lessonPlanId);

    if (!lessonPlan) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24">
                <h1 className="text-2xl font-bold">Lesson Plan Not Found</h1>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-12 bg-gray-100">
            <LessonPlanInterface initialLessonPlan={lessonPlan} />
        </main>
    );
}