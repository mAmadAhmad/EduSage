import Link from 'next/link';
import AILessonPlanGenerator from "./AILessonPlanGenerator";
import { LessonPlanActions } from './LessonPlanActions'; 

// Define the type for the lesson plan list
interface LessonPlanInfo {
  id: number;
  lesson_title: string;
}

// Fetch the list of lesson plans from our new backend endpoint
async function getLessonPlans(): Promise<LessonPlanInfo[]> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
    const res = await fetch(`${backendUrl}/content/lesson-plans/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch lesson plans');
    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    return [];
  }
}

export default async function SlideWorkspacePage() {
  const lessonPlans = await getLessonPlans();

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
              // 2. Update the list item structure to include the button
              <div key={plan.id} className="bg-white p-6 rounded-lg shadow-md border flex justify-between items-center">
                <Link href={`/slide-workspace/lesson-plans/${plan.id}`} className="block hover:underline">
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