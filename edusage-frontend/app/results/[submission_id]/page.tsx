'use client'; 

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Award, ArrowLeft, Home } from 'lucide-react';

interface GradedAnswerReport { 
    question_text: string; 
    student_answer: string; 
    correct_answer: string; 
    score: number; 
    feedback: string; 
}

interface GradeReportResponse { 
    student_name: string; 
    quiz_title: string; 
    overall_score: number | null; 
    overall_feedback: string | null; 
    graded_answers: GradedAnswerReport[]; 
}

export default function ResultsPage({ params }: { params: { submission_id: string } }) {
    const [report, setReport] = useState<GradeReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const res = await fetch(`${backendUrl}/submissions/${params.submission_id}/report`, {
                    cache: 'no-store',
                    credentials: 'include',
                });
                 if (!res.ok) {
                    if (res.status === 404) throw new Error('Your quiz is still being graded by the teacher.');
                    throw new Error('Failed to fetch grade report');
                }
                setReport(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [params.submission_id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md">
                <div className="text-red-500 mb-4 flex justify-center"><XCircle size={48} /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Report Not Available</h2>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link href="/" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    Back Home
                </Link>
            </div>
        </div>
    );

    if (!report) return null;

    const totalPossibleScore = report.graded_answers.length * 10;
    // Handle null overall_score safely
    const finalScore = report.overall_score ?? 0; 
    const percentage = Math.round((finalScore / totalPossibleScore) * 100);
    
    // Determine status color
    let statusColor = "text-purple-600 bg-purple-50 border-purple-100";
    if (percentage >= 80) statusColor = "text-green-600 bg-green-50 border-green-100";
    else if (percentage < 60) statusColor = "text-orange-600 bg-orange-50 border-orange-100";

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Nav */}
                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium text-sm">
                        <Home size={16} /> Home
                    </Link>
                    <div className="text-sm text-gray-400">Submission ID: #{params.submission_id}</div>
                </div>

                {/* Score Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                        <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${statusColor}`}>
                            <Award size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.quiz_title}</h1>
                        <p className="text-gray-500 mb-6">Student: {report.student_name}</p>
                        
                        <div className="flex justify-center items-end gap-2 mb-2">
                            <span className="text-5xl font-extrabold text-gray-900">{finalScore}</span>
                            <span className="text-xl text-gray-400 font-medium mb-1">/ {totalPossibleScore}</span>
                        </div>
                        <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2 mb-6">
                            <div className="bg-gray-900 h-2 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                        </div>
                        
                        {report.overall_feedback && (
                            <div className="bg-blue-50 border border-blue-100 text-blue-800 px-6 py-4 rounded-xl text-sm leading-relaxed text-left mx-auto max-w-2xl">
                                <span className="font-bold block mb-1 text-blue-900">Teacher's Feedback:</span>
                                {report.overall_feedback}
                            </div>
                        )}
                    </div>
                </div>

                {/* Questions List */}
                <div className="space-y-6">
                    {report.graded_answers.map((q, index) => {
                        const isPerfect = q.score === 10;
                        return (
                            <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Question Header */}
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded bg-gray-200 text-gray-600 font-bold text-xs mt-0.5">
                                            {index + 1}
                                        </span>
                                        <h3 className="text-gray-900 font-medium leading-snug">{q.question_text}</h3>
                                    </div>
                                    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${isPerfect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {q.score} / 10
                                    </span>
                                </div>

                                <div className="p-6">
                                    {/* Student Answer */}
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Your Answer</p>
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{q.student_answer}</p>
                                    </div>

                                    {/* Feedback Box */}
                                    <div className={`rounded-lg p-4 text-sm ${isPerfect ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-700'}`}>
                                        <div className="flex gap-2">
                                            {isPerfect ? <CheckCircle size={18} className="text-green-600 flex-shrink-0" /> : <div className="w-4" />}
                                            <div>
                                                <span className="font-bold block mb-1">Feedback</span>
                                                {q.feedback}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}