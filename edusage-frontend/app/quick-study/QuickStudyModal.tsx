'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { BookOpen, AlertCircle, Loader2, X } from 'lucide-react';
import ContextSelector from '../components/ContextSelector';

/**
 * QuickStudyModal Component
 * * Provides an interactive modal for users to launch a self-guided Quick Study session.
 * Handles context selection (file vs. text), parameter configuration (number of questions),
 * and dynamic API routing based on the selected inputs.
 */
export default function QuickStudyModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Context State
  const [sourceDoc, setSourceDoc] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputType, setInputType] = useState<'file' | 'text'>('file');

  // Configuration State
  const [numMcq, setNumMcq] = useState<number>(5);
  const [numShort, setNumShort] = useState<number>(0);

  const handleContextSelection = (value: string, type: 'file' | 'text') => {
      setInputType(type);
      setErrorMsg(null); // Clear errors on user interaction
      if (type === 'file') {
          setSourceDoc(value);
          setRawText('');
      } else {
          setRawText(value);
          setSourceDoc('');
      }
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMsg(null);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    // UI-Level Validation
    if (inputType === 'file' && !sourceDoc) {
        setErrorMsg("Please select a document from the list.");
        return;
    }
    if (inputType === 'text' && !rawText) {
        setErrorMsg("Please paste and confirm your text.");
        return;
    }

    setIsLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      const payload = {
        source_document: inputType === 'file' ? sourceDoc : null,
        text_content: inputType === 'text' ? rawText : null,
        num_mcq: numMcq,
        num_short_answer: numShort
      };
      
      const res = await fetch(`${backendUrl}/quick-study/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
         const errData = await res.json().catch(() => null);
         throw new Error(errData?.detail || 'Failed to start quick study session.');
      }
      
      const session = await res.json();
      handleClose();
      router.push(`/quick-study/${session.id}`);

    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
            <p className="text-gray-600 mt-1">Upload a document and test yourself.</p>
          </div>
        </div>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                
                <div className="flex justify-between items-start mb-4">
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="text-emerald-600" size={20}/>
                        Start Quick Study
                    </Dialog.Title>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{errorMsg}</p>
                  </div>
                )}

                <form onSubmit={handleStart} className="mt-4 space-y-6">
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <ContextSelector 
                        currentSelection={inputType === 'file' ? sourceDoc : rawText} 
                        onSelectionChange={handleContextSelection} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">MCQs</label>
                      <input 
                        type="number" 
                        value={numMcq} 
                        onChange={(e) => setNumMcq(parseInt(e.target.value) || 0)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm px-3 py-2 border text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"
                        min="0"
                        max="20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Short Answers</label>
                      <input 
                        type="number" 
                        value={numShort} 
                        onChange={(e) => setNumShort(parseInt(e.target.value) || 0)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm px-3 py-2 border text-gray-900 focus:ring-emerald-500 focus:border-emerald-500"
                        min="0"
                        max="10"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70 transition-colors"
                    >
                      {isLoading ? <><Loader2 size={16} className="animate-spin"/> Preparing...</> : 'Start Now'}
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