'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { BookOpen } from 'lucide-react';
import ContextSelector from '../components/ContextSelector';

export default function QuickStudyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for Context Selection
  const [sourceDoc, setSourceDoc] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputType, setInputType] = useState<'file' | 'text'>('file');

  const [numMcq, setNumMcq] = useState<number>(5);
  const [numShort, setNumShort] = useState<number>(0);
  const router = useRouter();

  // Handle switching between File and Text input
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

  const handleStart = async (e: React.FormEvent) => {
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
      
      // Dynamic Payload based on input type
      const payload = {
        source_document: inputType === 'file' ? sourceDoc : null,
        text_content: inputType === 'text' ? rawText : null,
        num_mcq: numMcq,
        num_short_answer: numShort
      };
      
      // Call the new "Quick Study" endpoint
      const res = await fetch(`${backendUrl}/quick-study/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to start quick study session.');
      
      const session = await res.json();

      setIsOpen(false);
      router.push(`/quick-study/${session.id}`);

    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* The Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full text-left group block bg-white rounded-2xl p-6 shadow-sm border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
            <BookOpen size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">Quick Study</h3>
            <p className="text-gray-600 mt-1">Upload a document and test yourself immediately. No setup required.</p>
          </div>
        </div>
      </button>

      {/* The Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Start Quick Study Session
                </Dialog.Title>
                <form onSubmit={handleStart} className="mt-4 space-y-4">
                  
                  {/* Context Selector */}
                  <div>
                    <ContextSelector 
                        currentSelection={inputType === 'file' ? sourceDoc : rawText} 
                        onSelectionChange={handleContextSelection} 
                    />
                  </div>

                  {/* Question Counts */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">MCQs</label>
                      <input 
                        type="number" 
                        value={numMcq} 
                        onChange={(e) => setNumMcq(parseInt(e.target.value) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Short Answers</label>
                      <input 
                        type="number" 
                        value={numShort} 
                        onChange={(e) => setNumShort(parseInt(e.target.value) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Preparing Quiz...' : 'Start Now'}
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