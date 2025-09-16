// app/dashboard/CreateQuizButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Make sure 'export default' is here
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
            question_text: "New Question 1",
            question_type: "MCQ",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correct_answer: "Option A"
          }
        ]
      };
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/quizzes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blankQuiz),
      });

      if (!res.ok) {
        throw new Error('Failed to create new quiz');
      }

      const newQuiz = await res.json();
      router.push(`/dashboard/quiz/${newQuiz.id}`);

    } catch (error) {
      console.error(error);
      alert('Could not create a new quiz.');
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateQuiz}
      disabled={isLoading}
      className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
    >
      {isLoading ? 'Creating...' : '+ Create New Quiz'}
    </button>
  );
}