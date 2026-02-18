'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import ContextSelector from '../components/ContextSelector'; 

export default function AIQuizGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State
  const [sourceDoc, setSourceDoc] = useState('');
  const [rawText, setRawText] = useState('');
  const [numMcq, setNumMcq] = useState<number | ''>(3);
  const [numShortAnswer, setNumShortAnswer] = useState<number | ''>(2);
  const [pageStart, setPageStart] = useState<number | ''>('');
  const [pageEnd, setPageEnd] = useState<number | ''>('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [difficulty, setDifficulty] = useState('Normal');
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  
  const router = useRouter();

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
    
    // Validation
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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const payload = {
        source_document: inputType === 'file' ? sourceDoc : null,
        text_content: inputType === 'text' ? rawText : null,  
        num_mcq: numMcq || 0,
        num_short_answer: numShortAnswer || 0,
        difficulty: difficulty,
        page_start: pageStart === '' ? null : pageStart,
        page_end: pageEnd === '' ? null : pageEnd,
        custom_instructions: customInstructions || "Please generate a standard quiz."
      };

      // 1. Generate
      const generateRes = await fetch(`${backendUrl}/docs/quiz/generate/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!generateRes.ok) throw new Error('Failed to generate quiz content.');
      const generatedQuiz = await generateRes.json();

      // 2. Save
      const saveRes = await fetch(`${backendUrl}/quizzes/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedQuiz),
      });
      if (!saveRes.ok) throw new Error('Failed to save the new quiz.');

      // 3. Redirect
      const newQuiz = await saveRes.json();
      setIsOpen(false);
      router.push(`/quiz-workspace/quiz/${newQuiz.id}`);
      router.refresh(); 

    } catch (error) {
      alert(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-md"
      >
        <Sparkles size={18} />
        <span>Generate with AI</span>
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-2xl transition-all">
                
                {/* Modal Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Sparkles className="text-purple-600" size={24}/>
                            AI Quiz Generator
                        </Dialog.Title>
                        <p className="text-sm text-gray-500 mt-1">Configure your settings and let AI do the heavy lifting.</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleGenerate} className="space-y-6">
                  
                  {/* Context Section */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <ContextSelector 
                        currentSelection={inputType === 'file' ? sourceDoc : rawText} 
                        onSelectionChange={handleContextSelection} 
                    />
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">MCQ Count</label>
                      <input type="number" value={numMcq}
                             onChange={(e) => setNumMcq(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-gray-900"/>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Short Answer Count</label>
                      <input type="number" value={numShortAnswer}
                             onChange={(e) => setNumShortAnswer(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                             className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-gray-900"/>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Difficulty</label>
                      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-gray-900">
                        <option>Easy</option>
                        <option>Normal</option>
                        <option>Hard</option>
                      </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Page Range (Opt)</label>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Start" value={pageStart}
                                onChange={(e) => setPageStart(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm text-gray-900"/>
                            <input type="number" placeholder="End" value={pageEnd}
                                onChange={(e) => setPageEnd(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm text-gray-900"/>
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Instructions</label>
                    <textarea value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              rows={2} placeholder="e.g., Focus on definitions and key dates..."
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-gray-900"/>
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                    <button type="button" onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isLoading}
                            className="px-6 py-2 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-70 flex items-center gap-2">
                      {isLoading ? <><Loader2 className="animate-spin" size={16}/> Generating...</> : 'Generate Quiz'}
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