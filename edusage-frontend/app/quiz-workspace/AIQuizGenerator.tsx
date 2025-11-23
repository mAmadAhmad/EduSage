'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';

export default function AIQuizGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceDoc, setSourceDoc] = useState('Geography_USA.pdf');
  const [numMcq, setNumMcq] = useState<number | ''>(3);
  const [numShortAnswer, setNumShortAnswer] = useState<number | ''>(2);
  const [pageStart, setPageStart] = useState<number | ''>('');
  const [pageEnd, setPageEnd] = useState<number | ''>('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');
  
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const payload = {
        source_document: sourceDoc,
        num_mcq: numMcq || 0,
        num_short_answer: numShortAnswer || 0,
        difficulty: difficulty,
        page_start: pageStart === '' ? null : pageStart,
        page_end: pageEnd === '' ? null : pageEnd,
        custom_instructions: customInstructions || "Please generate a standard quiz."
      };

      // Step 1: Generate (Doesn't strictly need auth currently, but good practice to add it)
      const generateRes = await fetch(`${backendUrl}/docs/quiz/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      if (!generateRes.ok) throw new Error('Failed to generate quiz content.');
      const generatedQuiz = await generateRes.json();

      // Step 2: Save (This endpoint DEFINITELY needs auth)
      const saveRes = await fetch(`${backendUrl}/quizzes/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(generatedQuiz),
      });
      if (!saveRes.ok) throw new Error('Failed to save the new quiz.');

      // Step 3: Redirect
      const newQuiz = await saveRes.json();
      setIsOpen(false);
      router.push(`/quiz-workspace/quiz/${newQuiz.id}`);
      router.refresh(); // Tell Next.js to re-fetch the dashboard data

    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="px-5 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
        + Generate with AI
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
             <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Generate Quiz with AI</Dialog.Title>
                <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                  
                  {/* --- ALL FORM FIELDS RESTORED --- */}
                  <div>
                    <label htmlFor="sourceDoc" className="block text-sm font-medium text-gray-700">Source Document</label>
                    <input type="text" id="sourceDoc" value={sourceDoc} onChange={(e) => setSourceDoc(e.target.value)}
                           className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pageStart" className="block text-sm font-medium text-gray-700">Page Start (Optional)</label>
                      <input type="number" id="pageStart" value={pageStart}
                             onChange={(e) => setPageStart(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                    </div>
                    <div>
                      <label htmlFor="pageEnd" className="block text-sm font-medium text-gray-700">Page End (Optional)</label>
                      <input type="number" id="pageEnd" value={pageEnd}
                             onChange={(e) => setPageEnd(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="numMcq" className="block text-sm font-medium text-gray-700">Number of MCQs</label>
                      <input type="number" id="numMcq" value={numMcq}
                             onChange={(e) => setNumMcq(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                    </div>
                    <div>
                      <label htmlFor="numShortAnswer" className="block text-sm font-medium text-gray-700">Number of Short Questions</label>
                      <input type="number" id="numShortAnswer" value={numShortAnswer}
                             onChange={(e) => setNumShortAnswer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-700">Custom Instructions (Optional)</label>
                    <textarea id="customInstructions" value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              rows={3} placeholder="e.g., Focus on definitions."
                              className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-2"/>
                  </div>
                  
                  <div className="mt-6 flex justify-end gap-4">
                    <button type="button" onClick={() => setIsOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isLoading}
                            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-gray-400">
                      {isLoading ? 'Generating...' : 'Generate Quiz'}
                    </button>
                  </div>
                  <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">Difficulty</label>
                  <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm">
                    <option>Easy</option>
                    <option>Normal</option>
                    <option>Hard</option>
                  </select>
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