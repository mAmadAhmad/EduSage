'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TakeQuizPage() {
  const [shareCode, setShareCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCode.trim()) {
      // We will build the page this redirects to in the next step
      router.push(`/take-quiz/${shareCode.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold text-gray-800">Take a Quiz</h1>
        <p className="mt-2 text-gray-600">Enter the share code provided by your teacher.</p>
        
        <form onSubmit={handleSubmit} className="mt-8">
          <input
            type="text"
            value={shareCode}
            onChange={(e) => setShareCode(e.target.value)}
            className="w-full px-4 py-3 text-lg text-center tracking-widest font-mono border-2 border-gray-300 rounded-md focus:outline-none focus:border-purple-500 text-gray-900"
            placeholder="A4F-G7H"
          />
          <button
            type="submit"
            className="w-full mt-4 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Start Quiz
          </button>
        </form>
      </div>
    </main>
  );
}