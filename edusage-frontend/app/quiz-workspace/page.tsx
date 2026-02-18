'use client';

import { useState, useEffect } from 'react'; 
import Link from 'next/link';
import CreateQuizButton from './CreateQuizButton';
import AIQuizGenerator from './AIQuizGenerator';
import QuizActions from './QuizActions';
import { LayoutGrid, GraduationCap, Clock, HelpCircle } from 'lucide-react';

interface Question { id: number; question_text: string; }
interface Quiz { id: number; title: string; instructions: string | null; questions: Question[]; }

export default function DashboardPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/quizzes/`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch quizzes');
        setQuizzes(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
        <div className="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <LayoutGrid className="text-purple-600" /> Quiz Workspace
            </h1>
            <p className="text-gray-500 mt-1">Manage, grade, and orchestrate your assessments.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CreateQuizButton />
            <AIQuizGenerator />
          </div>
        </div>
        
        {/* Content Section */}
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            Error loading workspace: {error}
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-purple-200 transition-all duration-200 flex flex-col h-full">
                 
                 {/* Card Body */}
                 <Link href={`/quiz-workspace/quiz/${quiz.id}`} className="p-6 flex-grow block">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-4 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                        <GraduationCap size={24} />
                      </div>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {quiz.questions.length} Qs
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors line-clamp-1">
                      {quiz.title}
                    </h2>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {quiz.instructions || 'No instructions provided.'}
                    </p>
                 </Link>
                
                 {/* Card Footer (Actions) */}
                 <div className="px-6 pb-6 mt-auto">
                    <QuizActions quizId={quiz.id} />
                 </div>
              </div>
            ))}
          </div>
        ) : (
           // Empty State
           <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center max-w-lg mx-auto mt-10">
             <div className="mx-auto h-16 w-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
               <HelpCircle size={32} />
             </div>
             <h3 className="text-lg font-bold text-gray-900">No quizzes yet</h3>
             <p className="text-gray-500 mt-2 mb-6">Get started by creating a manual quiz or let our AI generate one for you from your documents.</p>
           </div>
        )}
      </div>
    </main>
  );
}