'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle2, User, Hash } from 'lucide-react';

// Define the public types
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
  questions: PublicQuestion[];
}

export default function QuizInterface({ initialQuiz }: { initialQuiz: PublicQuiz }) {
  const [quiz] = useState<PublicQuiz>(initialQuiz);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const router = useRouter();
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };
  
  const handleSubmit = async () => {
    // Basic validation
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
        if (!confirm(`You have answered ${answeredCount} out of ${quiz.questions.length} questions. Submit anyway?`)) return;
    } else {
        if (!confirm('Ready to submit your quiz?')) return;
    }

    setIsSubmitting(true);
    
    const formattedAnswers = Object.entries(answers).map(([questionId, answerText]) => ({
      question_id: parseInt(questionId), answer_text: answerText,
    }));
    const submissionPayload = {
      student_name: studentName, student_roll_no: studentRollNo, answers: formattedAnswers,
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      // Get code from URL path safely
      const pathSegments = window.location.pathname.split('/');
      const shareCode = pathSegments[pathSegments.length - 1]; // Last segment

      const res = await fetch(`${backendUrl}/take-quiz/${shareCode}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!res.ok) throw new Error('Failed to submit quiz');

      // Redirect to the success/home page (or maybe show a success state here)
      // For now, let's just alert and go home, or we could redirect to a "Thank You" page
      alert("Quiz submitted successfully!");
      router.push('/'); 
      
    } catch (err) {
      alert('An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Registration Modal */}
      <Transition appear show={isStartModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => {}}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-2xl transition-all">
                 <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 mb-2">Welcome</Dialog.Title>
                 <p className="text-gray-500 mb-6">Please enter your details to start <strong>{quiz.title}</strong>.</p>
                
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

      {/* Main Quiz Area (Blurred if modal open) */}
      <div className={`w-full max-w-3xl mx-auto transition-all ${isStartModalOpen ? 'blur-md pointer-events-none' : ''}`}>
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{quiz.title}</h1>
            <p className="text-gray-500">{quiz.instructions || "Read the questions carefully and answer to the best of your ability."}</p>
        </div>

        {/* Scrollable Questions List */}
        <div className="space-y-6 pb-24">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 relative group hover:border-purple-200 transition-colors">
              {/* Question Number Badge */}
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
                />
              )}
            </div>
          ))}
        </div>

        {/* Floating Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="max-w-3xl mx-auto flex justify-between items-center">
                <div className="text-sm font-medium text-gray-500 hidden md:block">
                    {Object.keys(answers).length} of {quiz.questions.length} answered
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
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