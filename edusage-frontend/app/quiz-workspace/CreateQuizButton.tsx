'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';

/**
 * CreateQuizButton Component
 * * Provides a UI trigger to create a new, blank quiz scaffold in the backend.
 * Upon successful creation, redirects the user to the quiz editor workspace.
 * Handles loading states and provides visual error feedback inline.
 */
export default function CreateQuizButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleCreateQuiz = async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const blankQuiz = {
        title: "Untitled Quiz",
        instructions: "Add your instructions here.",
        questions: [
          {
            question_text: "New Question 1", 
            question_type: "MCQ",
            options: ["Option A", "Option B", "Option C", "Option D"], 
            correct_answer: "Option A"
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

      if (!res.ok) throw new Error('Failed to create quiz scaffold');
      
      const newQuiz = await res.json();
      router.push(`/quiz-workspace/quiz/${newQuiz.id}`);

    } catch (error) {
      console.error('Quiz creation error:', error);
      setHasError(true);
      // Reset the error state after 3 seconds
      setTimeout(() => setHasError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateQuiz}
      disabled={isLoading}
      className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50
        ${hasError 
          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' 
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
        }`}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin"/>
      ) : hasError ? (
        <AlertCircle size={18} />
      ) : (
        <PlusCircle size={18} />
      )}
      <span>{hasError ? 'Failed to Create' : 'Manual Create'}</span>
    </button>
  );
}