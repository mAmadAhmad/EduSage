'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen } from 'lucide-react';

/**
 * TakeQuizPage Component
 * * A public-facing portal for students to enter a 6-character access code
 * to join an active quiz session. Handles basic input validation and routing.
 */
export default function TakeQuizPage() {
  const [shareCode, setShareCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCode.trim()) {
      router.push(`/take-quiz/${shareCode.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 transform rotate-3">
                <BookOpen size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Student Portal</h1>
            <p className="mt-2 text-gray-500">Enter your 6-character access code to begin.</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
                    Share Code
                </label>
                <input
                    type="text"
                    value={shareCode}
                    onChange={(e) => setShareCode(e.target.value)}
                    className="w-full px-4 py-4 text-3xl text-center font-bold tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-50 text-gray-900 placeholder-gray-200 transition-all uppercase"
                    placeholder="XXXXXX"
                    maxLength={6}
                    autoFocus
                />
            </div>
            <button
                type="submit"
                disabled={shareCode.length < 3}
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                Start Quiz <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            </form>
        </div>
        
        <p className="text-center text-xs text-gray-400 mt-8">
            EduSage Secure Assessment Platform
        </p>
      </div>
    </main>
  );
}