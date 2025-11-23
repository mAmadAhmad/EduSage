'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';

export default function AILessonPlanGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceDoc, setSourceDoc] = useState('Geography_USA.pdf');
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/content/generate-lesson`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source_document: sourceDoc }), // Add other params as needed
      });

      if (!res.ok) {
         if (res.status === 401) throw new Error('Unauthorized. Please log in again.');
         throw new Error('Failed to generate lesson plan.');
      }
      
      const newLessonPlan = await res.json();
      setIsOpen(false);
      router.push(`/slide-workspace/lesson-plans/${newLessonPlan.id}`);
      router.refresh(); // Refresh dashboard

    } catch (error) {
       alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
        + Create Lesson Plan
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
          {/* ... (Modal styling is the same as AIQuizGenerator) ... */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Generate Lesson Plan with AI
                </Dialog.Title>
                <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="sourceDoc" className="block text-sm font-medium text-gray-700">Source Document</label>
                    <input type="text" id="sourceDoc" value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)}
                           className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm"/>
                  </div>
                  <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isLoading} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400">
                      {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}