'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Trash2, FileText, Loader2, AlertTriangle, CheckCircle2, Copy, Power, PowerOff } from 'lucide-react';
import { useState, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';

/**
 * QuizActions Component
 * Renders the action footer for a quiz card (Toggle Status, Submissions, Share, Delete).
 * Handles API interactions for sharing, deletion, and status toggling.
 * @param {number} quizId - The unique identifier of the quiz.
 * @param {function} onDeleteSuccess - Callback fired after successful API deletion.
 */
export default function QuizActions({ quizId, onDeleteSuccess }: { quizId: number, onDeleteSuccess?: () => void }) {
  const router = useRouter();
  
  // Interaction States
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Modal & Status States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{ code: string, is_active: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/${quizId}`, {
          method: 'DELETE',
          credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete');
      
      setIsDeleteModalOpen(false);
      if (onDeleteSuccess) onDeleteSuccess();
      router.refresh(); 
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeShare = async () => {
    setIsSharing(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/${quizId}/share`, {
          method: 'POST',
          credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to share');
      const data = await res.json();
      
      setShareData({ code: data.share_code, is_active: data.is_active }); 
    } catch (error) {
       console.error('Share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const toggleQuizStatus = async () => {
    if (!shareData) return;
    setIsToggling(true);
    const newStatus = !shareData.is_active;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/share/${shareData.code}/toggle`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: newStatus }),
          credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to toggle status');
      
      setShareData({ ...shareData, is_active: newStatus });
      showToast(`Quiz submissions have been ${newStatus ? 'enabled' : 'disabled'}.`, 'success');
    } catch (error) {
       showToast('Failed to change quiz status.', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareData) return;
    await navigator.clipboard.writeText(shareData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-auto">
        <Link 
          href={`/quiz-workspace/quiz/${quizId}/submissions`} 
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all group"
          title="View Submissions"
        >
          <FileText size={16} className="text-purple-500 group-hover:text-purple-700" />
          <span>Results</span>
        </Link>

        <button 
          onClick={executeShare} 
          disabled={isSharing}
          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all disabled:opacity-50"
          title="Share Quiz"
        >
          {isSharing ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />}
        </button>

        <button 
          onClick={() => setIsDeleteModalOpen(true)} 
          disabled={isDeleting}
          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all disabled:opacity-50"
          title="Delete Quiz"
        >
          {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18} />}
        </button>
      </div>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <Transition appear show={isDeleteModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isDeleting && setIsDeleteModalOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">Delete Quiz</Dialog.Title>
                    <p className="text-sm text-gray-500">This action cannot be undone.</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" onClick={executeDelete} disabled={isDeleting}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50">
                    {isDeleting ? <><Loader2 size={16} className="animate-spin"/> Deleting...</> : 'Yes, delete'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- SHARE & TOGGLE MODAL --- */}
      <Transition appear show={!!shareData} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShareData(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 align-middle shadow-xl transition-all relative">
                
                {toast && (
                  <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-[90%] px-3 py-2 rounded shadow-md text-xs font-medium text-center z-10 transition-all ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {toast.message}
                  </div>
                )}

                <div className="flex flex-col items-center text-center mt-4">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 mb-1">Quiz Share Code</Dialog.Title>
                    <p className="text-sm text-gray-500 mb-6">Students can use this code to access the quiz.</p>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl mb-6">
                  <span className={`text-2xl font-mono font-bold tracking-widest ${shareData?.is_active ? 'text-purple-700' : 'text-gray-400 line-through'}`}>{shareData?.code}</span>
                  <button onClick={copyToClipboard} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                    {copied ? <CheckCircle2 size={20} className="text-green-500"/> : <Copy size={20} />}
                  </button>
                </div>

                {/* The Toggle Switch */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-xl mb-6">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Accepting Submissions</p>
                        <p className="text-xs text-gray-500">{shareData?.is_active ? 'Quiz is live and open' : 'Quiz is currently closed'}</p>
                    </div>
                    <Switch
                        checked={shareData?.is_active || false}
                        onChange={toggleQuizStatus}
                        disabled={isToggling}
                        className={`${shareData?.is_active ? 'bg-green-500' : 'bg-gray-300'}
                        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 disabled:opacity-50`}
                    >
                        <span className="sr-only">Toggle Quiz Status</span>
                        <span
                        aria-hidden="true"
                        className={`${shareData?.is_active ? 'translate-x-5' : 'translate-x-0'}
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
                        />
                    </Switch>
                </div>

                <button type="button" onClick={() => setShareData(null)}
                        className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">
                  Close
                </button>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}