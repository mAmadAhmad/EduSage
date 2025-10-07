'use client';

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const router = useRouter();
  
  const [isStartModalOpen, setIsStartModalOpen] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };
  
  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit your quiz?')) return;
    setIsSubmitting(true);
    
    const formattedAnswers = Object.entries(answers).map(([questionId, answerText]) => ({
      question_id: parseInt(questionId),
      answer_text: answerText,
    }));

    const submissionPayload = {
      student_name: studentName,
      student_roll_no: studentRollNo,
      answers: formattedAnswers,
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      // Use the share_code from the initialQuiz or params to submit
      const shareCode = (initialQuiz as any).share_code || window.location.pathname.split('/').pop();
      const res = await fetch(`${backendUrl}/take-quiz/${shareCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to submit quiz');
      }

      alert("Quiz submitted successfully!");
      router.push('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An unknown error occurred.');
      setIsSubmitting(false);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  if (!currentQuestion) return <p>Loading question...</p>;

  return (
    <>
      <Transition appear show={isStartModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => {}}>
          {/* ... Modal background and panel are the same ... */}
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl">
                 <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Enter Your Details</Dialog.Title>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)}
                           className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-3"/>
                  </div>
                  <div>
                    <label htmlFor="studentRollNo" className="block text-sm font-medium text-gray-700">Roll Number (Optional)</label>
                    <input type="text" id="studentRollNo" value={studentRollNo} onChange={(e) => setStudentRollNo(e.target.value)}
                           className="mt-1 block w-full rounded-md border-gray-300 text-gray-900 shadow-sm sm:text-sm px-3"/>
                  </div>
                </div>
                <div className="mt-6">
                  <button type="button" disabled={!studentName.trim()} onClick={() => setIsStartModalOpen(false)}
                          className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-gray-400">
                    Start Quiz
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className={`w-full max-w-2xl p-8 bg-white rounded-xl shadow-lg ${isStartModalOpen ? 'blur-sm' : ''}`}>
        {/* --- THIS IS THE RESTORED QUIZ RENDERING LOGIC --- */}
        <h1 className="text-3xl font-bold text-gray-800 border-b pb-4">{quiz.title}</h1>
        <p className="mt-2 text-gray-600">{quiz.instructions}</p>
        
        <div className="mt-8">
          <p className="font-semibold text-xl text-gray-800">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </p>
          <p className="mt-2 text-lg text-gray-900">{currentQuestion.question_text}</p>
          
          <div className="mt-6 space-y-3">
            {currentQuestion.question_type === 'MCQ' && currentQuestion.options ? (
              currentQuestion.options.map((option, index) => (
                <label key={index} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${answers[currentQuestion.id] === option ? 'bg-purple-100 border-purple-400' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <input type="radio" name={`question-${currentQuestion.id}`} value={option}
                         checked={answers[currentQuestion.id] === option}
                         onChange={() => handleAnswerSelect(currentQuestion.id, option)}
                         className="h-5 w-5 text-purple-600 focus:ring-purple-500" />
                  <span className="ml-4 text-gray-800">{option}</span>
                </label>
              ))
            ) : (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                className="w-full mt-2 p-3 border rounded bg-white text-gray-900"
                rows={5} placeholder="Your answer..."
              />
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button onClick={() => setCurrentQuestionIndex(i => i - 1)} disabled={currentQuestionIndex === 0}
                  className="px-5 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50">
            Previous
          </button>
          
          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button onClick={() => setCurrentQuestionIndex(i => i + 1)} className="px-5 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">
              Next
            </button>
          )}
        </div>
        {/* --- END OF RESTORED LOGIC --- */}
      </div>
    </>
  );
}