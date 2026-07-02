'use client';

import { useState, useEffect } from 'react'; 
import Link from 'next/link';
import CreateQuizButton from './CreateQuizButton';
import AIQuizGenerator from './AIQuizGenerator';
import QuizActions from './QuizActions';
import { LayoutGrid, GraduationCap, HelpCircle, Clock } from 'lucide-react';

interface Question { id: number; question_text: string; }
interface Quiz { id: number; title: string; instructions: string | null; time_limit_minutes: number | null; questions: Question[]; }

/**
 * DashboardPage (Quiz Workspace)
 * Fetches and displays all quizzes belonging to the authenticated user.
 * Implements optimistic UI updates for child component deletions.
 */
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

  const handleRemoveQuizFromState = (deletedQuizId: number) => {
    setQuizzes((prevQuizzes) => prevQuizzes.filter(q => q.id !== deletedQuizId));
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-purple-200 rounded-full mb-4"></div>
        <div className="h-4 w-48 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <LayoutGrid className="text-purple-600" /> Quiz Space
            </h1>
            <p className="text-gray-500 mt-1 font-medium">Manage, grade, and orchestrate quizzes. Generate with AI or build from scratch.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CreateQuizButton />
            <AIQuizGenerator />
          </div>
        </div>
        
        {error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium shadow-sm">
            Error loading workspace: {error}
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="group bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col h-full overflow-hidden relative">
                 {/* Decorative Top Gradient */}
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 
                 <Link href={`/quiz-workspace/quiz/${quiz.id}`} className="p-6 pt-8 flex-grow block relative">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform shadow-sm border border-purple-100">
                        <GraduationCap size={24} />
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                          <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200">
                            {quiz.questions.length} Qs
                          </span>
                          {quiz.time_limit_minutes && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                                  <Clock size={12} /> {quiz.time_limit_minutes}m
                              </span>
                          )}
                      </div>
                    </div>
                    
                    <h2 className="text-xl font-extrabold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors line-clamp-1">
                      {quiz.title}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">
                      {quiz.instructions || 'No instructions provided.'}
                    </p>
                 </Link>
                
                 <div className="px-6 pb-6 mt-auto">
                    <QuizActions 
                        quizId={quiz.id} 
                        onDeleteSuccess={() => handleRemoveQuizFromState(quiz.id)} 
                    />
                 </div>
              </div>
            ))}
          </div>
        ) : (
           <div className="bg-white rounded-3xl border-2 border-dashed border-gray-300 p-16 text-center max-w-lg mx-auto mt-10 shadow-sm">
             <div className="mx-auto h-20 w-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-purple-50/50">
               <HelpCircle size={40} />
             </div>
             <h3 className="text-2xl font-extrabold text-gray-900 mb-2">No quizzes yet</h3>
             <p className="text-gray-500 font-medium">Get started by creating a manual quiz or let our AI generate one for you directly from your course PDFs.</p>
           </div>
        )}
      </div>
    </main>
  );
}