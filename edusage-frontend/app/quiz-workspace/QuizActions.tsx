'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Share2, Trash2, FileText, Loader2, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

/**
 * QuizActions Component
 * * Renders the action footer for a quiz card (Submissions, Share, Delete).
 * Handles API interactions for sharing and deletion, utilizing local modals
 * to prevent blocking the main browser thread with native alerts.
 * * @param {number} quizId - The unique identifier of the quiz.
 * @param {function} onDeleteSuccess - Callback fired after successful API deletion to optimistically update parent UI.
 */
export default function QuizActions({ quizId, onDeleteSuccess }: { quizId: number, onDeleteSuccess?: () => void }) {
  const router = useRouter();
  
  // Interaction States
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [shareData, setShareData] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
      // Optimistically update the parent UI instantly
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
      setShareData({ code: data.share_code });
    } catch (error) {
       console.error('Share error:', error);
    } finally {
      setIsSharing(false);
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
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
          title="View Submissions"
        >
          <FileText size={16} className="text-gray-500 group-hover:text-blue-600" />
          <span className="group-hover:text-blue-700">Results</span>
        </Link>

        <button 
          onClick={executeShare} 
          disabled={isSharing}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          title="Share Quiz"
        >
          {isSharing ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />}
        </button>

        <button 
          onClick={() => setIsDeleteModalOpen(true)} 
          disabled={isDeleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

      {/* --- SHARE SUCCESS MODAL --- */}
      <Transition appear show={!!shareData} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShareData(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center align-middle shadow-xl transition-all">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 mb-2">Quiz Ready to Share!</Dialog.Title>
                <p className="text-sm text-gray-500 mb-6">Students can use this code to access the quiz.</p>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mb-6">
                  <span className="text-2xl font-mono font-bold tracking-widest text-purple-700">{shareData?.code}</span>
                  <button onClick={copyToClipboard} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors">
                    {copied ? <CheckCircle2 size={20} className="text-green-500"/> : <Copy size={20} />}
                  </button>
                </div>

                <button type="button" onClick={() => setShareData(null)}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
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