'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  User
} from 'lucide-react';

interface ResultSummary {
  submission_id: number;
  quiz_title: string;
  student_name: string;
  score: number | null;
  status: string;
}

/**
 * ResultsHub Component
 * * Serves as the central dashboard for students to view their historical quiz results.
 * Automatically fetches records for authenticated users, while providing a manual 
 * lookup form for unauthenticated guest students.
 */
export default function ResultsHub() {
  const [myResults, setMyResults] = useState<ResultSummary[]>([]);
  const [guestCode, setGuestCode] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/take-quiz/my-submissions`, {
          credentials: 'include',
        });

        if (res.ok) {
          setMyResults(await res.json());
        } else {
          // Silent catch for 401s (Unauthenticated guest users)
          console.debug("Guest user detected. Relying on manual submission ID search.");
        }
      } catch (err) {
        console.error("Failed to fetch historical results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleGuestSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestCode.trim()) return;
    router.push(`/results/${guestCode}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 pt-24">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header Title */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={40} /> Result Center
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Check your grades and review teacher feedback.</p>
        </div>

        {/* SECTION 1: Guest Search Form */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="max-w-md mx-auto">
            <label className="block text-sm font-bold text-gray-700 mb-3 text-center uppercase tracking-wide">
              Checking as a Guest?
            </label>
            <form onSubmit={handleGuestSearch} className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="number"
                placeholder="Enter Submission ID (e.g. 45)"
                value={guestCode}
                onChange={(e) => setGuestCode(e.target.value)}
                className="w-full pl-12 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-medium text-gray-900"
              />
              <button
                type="submit"
                disabled={!guestCode.trim()}
                className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:hover:bg-purple-600"
                title="Search Results"
              >
                <ArrowRight size={20} />
              </button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-3 font-medium">
              Enter the Submission ID provided at the end of your quiz.
            </p>
          </div>
        </div>

        {/* SECTION 2: Authenticated User History */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="text-purple-600" /> Your Quiz History
          </h2>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                 <div className="h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                 <p className="text-gray-500 font-medium">Loading your records...</p>
             </div>
          ) : myResults.length > 0 ? (
            <div className="grid gap-4">
              {myResults.map((result) => (
                <Link
                  key={result.submission_id}
                  href={`/results/${result.submission_id}`}
                  className="block bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md hover:border-purple-300 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${result.score !== null ? 'bg-green-50 text-green-600 group-hover:bg-green-100' : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100'}`}>
                        {result.score !== null ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors line-clamp-1">
                          {result.quiz_title}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar size={14} /> Submission #{result.submission_id}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                      {result.score !== null ? (
                        <div>
                          <span className="block text-2xl font-extrabold text-gray-900">{result.score}</span>
                          <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full tracking-wide">GRADED</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full tracking-wide">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="mx-auto h-12 w-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                  <Trophy size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No History Found</h3>
              <p className="text-gray-500 mt-1">You haven't taken any quizzes while logged in.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}