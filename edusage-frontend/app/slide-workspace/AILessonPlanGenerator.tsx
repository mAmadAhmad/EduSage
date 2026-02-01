'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import ContextSelector from '../components/ContextSelector';

export default function AILessonPlanGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Context
  const [sourceDoc, setSourceDoc] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  
  const router = useRouter();

  // Callback for ContextSelector
  const handleContextSelection = (value: string, type: 'file' | 'text') => {
      setInputType(type);
      if (type === 'file') {
          setSourceDoc(value);
          setRawText('');
      } else {
          setRawText(value);
          setSourceDoc('');
      }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputType === 'file' && !sourceDoc) {
        alert("Please select a document from the list.");
        return;
    }
    if (inputType === 'text' && !rawText) {
        alert("Please paste and confirm your text.");
        return;
    }
    
    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
      
      const payload = {
        source_document: inputType === 'file' ? sourceDoc : null,
        text_content: inputType === 'text' ? rawText : null,
        instructions: "Create a standard 45-minute lesson plan." // Default or add a field for this
      };

      const res = await fetch(`${backendUrl}/content/generate-lesson`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
         if (res.status === 401) throw new Error('Unauthorized. Please log in again.');
         throw new Error('Failed to generate lesson plan.');
      }
      
      const newLessonPlan = await res.json();
      setIsOpen(false);
      router.push(`/slide-workspace/lesson-plans/${newLessonPlan.id}`);
      router.refresh();

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
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
             <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Generate Lesson Plan with AI
                </Dialog.Title>
                <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                  
                  {/* Context Selector */}
                  <div>
                    <ContextSelector 
                        currentSelection={inputType === 'file' ? sourceDoc : rawText} 
                        onSelectionChange={handleContextSelection} 
                    />
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