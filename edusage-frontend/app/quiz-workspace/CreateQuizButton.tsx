'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

export default function CreateQuizButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateQuiz = async () => {
    setIsLoading(true);
    try {
      const blankQuiz = {
        title: "Untitled Quiz",
        instructions: "Add your instructions here.",
        questions: [
          {
            question_text: "New Question 1", question_type: "MCQ",
            options: ["Option A", "Option B", "Option C", "Option D"], correct_answer: "Option A"
          }
        ]
      };
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quizzes/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blankQuiz),
      });

      if (!res.ok) throw new Error('Failed');
      const newQuiz = await res.json();
      router.push(`/quiz-workspace/quiz/${newQuiz.id}`);

    } catch (error) {
      alert('Could not create a new quiz.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateQuiz}
      disabled={isLoading}
      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all disabled:opacity-50"
    >
      {isLoading ? <Loader2 size={18} className="animate-spin"/> : <PlusCircle size={18} />}
      <span>Manual Create</span>
    </button>
  );
}