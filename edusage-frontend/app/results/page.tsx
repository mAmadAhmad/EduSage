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

export default function ResultsHub() {
  const [myResults, setMyResults] = useState<ResultSummary[]>([]);
  const [guestCode, setGuestCode] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Fetch Logged-in User Results
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
          // If 401, they are just a guest, which is fine.
          console.log("User not logged in or no results found.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  // 2. Handle Guest Search
  const handleGuestSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestCode.trim()) return;
    // Redirect to the existing individual result page
    // Assuming the guest knows their submission ID.
    // In a real app, we'd give them a hashed "Access Key" instead of a raw ID for privacy.
    router.push(`/results/${guestCode}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 pt-24">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
            <Trophy className="text-yellow-500" size={40} /> Result Center
          </h1>
          <p className="text-gray-500 mt-2">Check your grades and review teacher feedback.</p>
        </div>

        {/* SECTION 1: Guest Search (For friction-less students) */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="max-w-md mx-auto">
            <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
              Checking as a Guest?
            </label>
            <form onSubmit={handleGuestSearch} className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                type="number"
                placeholder="Enter Submission ID (e.g. 45)"
                value={guestCode}
                onChange={(e) => setGuestCode(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
              >
                <ArrowRight size={20} />
              </button>
            </form>
            <p className="text-xs text-center text-gray-400 mt-3">
              Enter the Submission ID provided at the end of your quiz.
            </p>
          </div>
        </div>

        {/* SECTION 2: Logged In History */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="text-purple-600" /> Your Quiz History
          </h2>

          {loading ? (
             <div className="text-center py-10 text-gray-400">Loading records...</div>
          ) : myResults.length > 0 ? (
            <div className="grid gap-4">
              {myResults.map((result) => (
                <Link
                  key={result.submission_id}
                  href={`/results/${result.submission_id}`}
                  className="block bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md hover:border-purple-200 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center ${result.score !== null ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {result.score !== null ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-700 transition-colors">
                          {result.quiz_title}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Calendar size={14} /> Submission #{result.submission_id}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {result.score !== null ? (
                        <div>
                          <span className="block text-2xl font-extrabold text-gray-900">{result.score}</span>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">GRADED</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">You haven't taken any quizzes while logged in.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}