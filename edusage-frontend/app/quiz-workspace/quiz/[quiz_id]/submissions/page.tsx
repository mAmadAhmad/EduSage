'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, CheckCircle2 } from 'lucide-react';

interface Answer { question_id: number; answer_text: string; }
interface Submission { id: number; student_name: string; student_roll_no: string | null; answers: Answer[]; }

export default function SubmissionsPage({ params }: { params: { quiz_id: string } }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await fetch(`${backendUrl}/quizzes/${params.quiz_id}/submissions`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch submissions');
        setSubmissions(await res.json());
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [params.quiz_id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/quiz-workspace" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4 font-medium">
            <ArrowLeft size={18}/> Back to Dashboard
          </Link>
          <div className="flex justify-between items-end">
            <h1 className="text-3xl font-bold text-gray-900">Class Submissions</h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                {submissions.length} Students
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {submissions.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <User size={16} />
                                    </div>
                                    <span className="font-medium text-gray-900">{sub.student_name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                                {sub.student_roll_no || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 size={12} /> Submitted
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Link 
                                    href={`/quiz-workspace/submissions/${sub.id}`} 
                                    className="inline-flex items-center justify-center px-4 py-2 border border-blue-200 shadow-sm text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Grade Submission
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
              </table>
            ) : (
                <div className="p-12 text-center">
                    <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="text-gray-400" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No submissions yet</h3>
                    <p className="text-gray-500 mt-1">Share the quiz code with your students to get started.</p>
                </div>
            )}
        </div>
      </div>
    </main>
  );
}