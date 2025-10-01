// app/slide-workspace/page.tsx
import AILessonPlanGenerator from "../quiz-workspace/AILessonPlanGenerator"; // We can reuse this component

export default function SlideWorkspacePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <div className="w-full max-w-4xl">
        <div className='flex justify-between items-center mb-8'>
          <h1 className="text-4xl font-bold text-gray-800">Slide Workspace</h1>
          <div className="flex gap-4">
            <AILessonPlanGenerator />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border text-center">
            <p className="text-gray-600">Your saved lesson plans will appear here.</p>
        </div>
      </div>
    </main>
  );
}