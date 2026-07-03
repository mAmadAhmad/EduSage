'use client';

import { useState, Fragment, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle2, User, Hash, AlertTriangle, AlertCircle, Copy, Check, Clock } from 'lucide-react';

interface PublicQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
}

interface PublicQuiz {
  id: number;
  title: string;
  instructions: string | null;
  time_limit_minutes: number | null;
  questions: PublicQuestion[];
}

export default function QuizInterface({ initialQuiz }: { initialQuiz: PublicQuiz }) {
  const [quiz] = useState<PublicQuiz>(initialQuiz);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const router = useRouter();

  // Registration State
  const [isStartModalOpen, setIsStartModalOpen] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Success State for Guest PIN
  const [submissionResult, setSubmissionResult] = useState<{ id: number, access_pin: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Anti-Cheat State
  const [infractions, setInfractions] = useState(0);

  // Timer States
  const [timeLeft, setTimeLeft] = useState<number | null>(
      initialQuiz.time_limit_minutes ? initialQuiz.time_limit_minutes * 60 : null
  );
  // NEW: Flag to prevent infinite submission loops
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 5000);
  };

  // Timer Logic
  useEffect(() => {
    if (timeLeft === null || isStartModalOpen || submissionResult || isSubmitting) return;

    // Auto-submit when time reaches 0 (and only do it once)
    if (timeLeft <= 0 && !hasAutoSubmitted) {
        setHasAutoSubmitted(true); // Lock the auto-submit
        showToast('error', 'Time is up! Submitting your answers automatically.');
        executeSubmission();
        return;
    }

    const timerId = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isStartModalOpen, submissionResult, isSubmitting, hasAutoSubmitted]);

  // Anti-Cheat Visibility API Hook
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isStartModalOpen && !submissionResult && !isSubmitting && timeLeft !== 0) {
        setInfractions((prev) => prev + 1);
        showToast('error', 'Warning: You left the quiz tab. This action has been recorded.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isStartModalOpen, submissionResult, isSubmitting, timeLeft]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const triggerSubmitFlow = () => {
      setIsConfirmModalOpen(true);
  };

  const executeSubmission = async () => {
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);
    setToast(null);

    const formattedAnswers = Object.entries(answers).map(([questionId, answerText]) => ({
      question_id: parseInt(questionId), answer_text: answerText,
    }));

    const submissionPayload = {
      student_name: studentName,
      student_roll_no: studentRollNo,
      answers: formattedAnswers,
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const pathSegments = window.location.pathname.split('/');
      const shareCode = pathSegments[pathSegments.length - 1];

      const res = await fetch(`${backendUrl}/take-quiz/${shareCode}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || 'Failed to submit quiz');
      }

      const submissionData = await res.json();

      setSubmissionResult({
          id: submissionData.id,
          access_pin: submissionData.access_pin
      });

    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'An error occurred during submission.');
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
      if (!submissionResult) return;
      navigator.clipboard.writeText(`ID: ${submissionResult.id} | PIN: ${submissionResult.access_pin}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const preventClipboardActions = (e: React.ClipboardEvent) => {
    e.preventDefault();
    showToast('error', 'Copying and pasting are disabled during the assessment.');
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === quiz.questions.length;

  if (submissionResult) {
      return (
          <div className="w-full max-w-2xl mx-auto mt-12 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12 text-center animate-in zoom-in-95 duration-500">
              <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Quiz Submitted!</h1>
              <p className="text-gray-500 mb-8 text-lg">Your teacher will grade your submission. Save the details below to check your results later.</p>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 max-w-md mx-auto mb-8 relative group">
                  <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Submission ID</p>
                          <p className="text-2xl font-mono font-bold text-gray-900">{submissionResult.id}</p>
                      </div>
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Access PIN</p>
                          <p className="text-2xl font-mono font-bold text-purple-600">{submissionResult.access_pin}</p>
                      </div>
                  </div>
                  <button
                      onClick={copyToClipboard}
                      className="absolute top-4 right-4 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-colors"
                      title="Copy to clipboard"
                  >
                      {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
              </div>

              <button
                  onClick={() => router.push('/')}
                  className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
              >
                  Return to Homepage
              </button>
          </div>
      );
  }

  return (
    <>
      {toast && (
          <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-8 ${
              toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
              <AlertCircle size={18} />
              <span className="font-medium text-sm">{toast.message}</span>
          </div>
      )}

      {/* Registration Modal */}
      <Transition appear show={isStartModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-2xl transition-all">
                 <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-2">Welcome</Dialog.Title>
                 <p className="text-gray-500 mb-6">Please enter your details to start <strong>{quiz.title}</strong>.</p>

                {quiz.time_limit_minutes && (
                    <div className="mb-6 flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 text-sm font-medium">
                        <Clock size={18} /> This quiz has a strict time limit of {quiz.time_limit_minutes} minutes.
                    </div>
                )}

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 bg-gray-50 focus:bg-white transition-all" placeholder="John Doe"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Roll Number (Optional)</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input type="text" value={studentRollNo} onChange={(e) => setStudentRollNo(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-gray-900 bg-gray-50 focus:bg-white transition-all" placeholder="e.g. 2023-CS-101"/>
                    </div>
                  </div>
                </div>

                <button type="button" disabled={!studentName.trim()} onClick={() => setIsStartModalOpen(false)}
                        className="w-full mt-8 bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
                  Start Assessment
                </button>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Confirmation Modal */}
      <Transition appear show={isConfirmModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsConfirmModalOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-full ${isComplete ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {isComplete ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                        {isComplete ? 'Ready to Submit?' : 'Incomplete Quiz'}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500">
                        {isComplete
                            ? 'You have answered all questions. Submit your quiz for grading?'
                            : `You have only answered ${answeredCount} out of ${quiz.questions.length} questions. Are you sure you want to submit?`}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsConfirmModalOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Return to Quiz
                  </button>
                  <button type="button" onClick={executeSubmission}
                          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black">
                    Submit Final Answers
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div
        className={`w-full max-w-3xl mx-auto transition-all ${isStartModalOpen ? 'blur-md pointer-events-none' : ''}`}
        onCopy={preventClipboardActions}
        onPaste={preventClipboardActions}
        onCut={preventClipboardActions}
      >

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 text-center relative">
            {timeLeft !== null && (
                <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border ${
                    timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}>
                    <Clock size={16} />
                    {formatTime(timeLeft)}
                </div>
            )}

            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 mt-4">{quiz.title}</h1>
            <p className="text-gray-500">{quiz.instructions || "Read the questions carefully and answer to the best of your ability."}</p>
        </div>

        <div className="space-y-6 pb-24">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 relative group hover:border-purple-200 transition-colors">
              <div className="absolute top-6 left-0 w-1 h-8 bg-purple-600 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="mb-6">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Question {index + 1}</span>
                  <h3 className="text-lg font-semibold text-gray-900 leading-snug">{q.question_text}</h3>
              </div>

              {q.question_type === 'MCQ' && q.options ? (
                <div className="grid grid-cols-1 gap-3">
                  {q.options.map((option, optIndex) => (
                    <label key={optIndex}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            answers[q.id] === option 
                            ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' 
                            : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 ${answers[q.id] === option ? 'border-purple-600' : 'border-gray-300'}`}>
                            {answers[q.id] === option && <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />}
                        </div>
                        <span className={`text-sm font-medium ${answers[q.id] === option ? 'text-purple-900' : 'text-gray-700'}`}>
                            {option}
                        </span>
                        <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={() => handleAnswerSelect(q.id, option)}
                            className="hidden"
                        />
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                  className="w-full p-4 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white transition-all text-base min-h-[140px]"
                  placeholder="Type your answer here..."
                  disabled={timeLeft === 0}
                />
              )}
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="max-w-3xl mx-auto flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500 hidden md:block">
                    {answeredCount} of {quiz.questions.length} answered
                </div>
                <button
                    onClick={triggerSubmitFlow}
                    disabled={isSubmitting || timeLeft === 0}
                    className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black disabled:opacity-70 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>Submitting...</>
                    ) : (
                        <>Submit Quiz <CheckCircle2 size={18} /></>
                    )}
                </button>
            </div>
        </div>

      </div>
    </>
  );
}