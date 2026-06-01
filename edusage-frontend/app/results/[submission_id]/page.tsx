'use client'; 

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Award, ArrowLeft, Home, AlertCircle } from 'lucide-react';

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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    
    const searchParams = useSearchParams();
    const pin = searchParams.get('pin');

    useEffect(() => {
        let isMounted = true; 

        const userState = localStorage.getItem('userState');
        setIsLoggedIn(!!userState);
        
        const fetchReport = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                
                const activePin = pin || new URLSearchParams(window.location.search).get('pin');

                const url = activePin 
                    ? `${backendUrl}/submissions/${params.submission_id}/report?pin=${activePin}`
                    : `${backendUrl}/submissions/${params.submission_id}/report`;

                const res = await fetch(url, {
                    cache: 'no-store',
                    credentials: 'include',
                });
                
                if (!isMounted) return;

                if (!res.ok) {
                    if (res.status === 403) throw new Error("Invalid PIN. You do not have permission to view this report.");
                    if (res.status === 404) throw new Error("Report not found. Your teacher may not have graded it yet.");
                    throw new Error("Failed to fetch report.");
                }

                const data = await res.json();
                
                if (!isMounted) return;

                setError(null);
                setReport(data);
            } catch (err) {
                if (!isMounted) return;
                
                setError(err instanceof Error ? err.message : 'Failed to load report.');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchReport();
        
        return () => {
            isMounted = false;
        };
    }, [params.submission_id, pin]); 

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium animate-pulse">Retrieving your grade report...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
                    <div className="mx-auto h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Unavailable</h2>
                    <p className="text-gray-500 mb-8">{error}</p>
                    
                    <Link 
                        href={isLoggedIn ? "/home" : "/"} 
                        className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        {isLoggedIn ? "Return to Dashboard" : "Return to Homepage"}
                    </Link>
                </div>
            </div>
        );
    }

    if (!report) return null;

    const totalPossibleScore = report.graded_answers.length * 10;
    const finalScore = report.overall_score ?? 0; 
    const percentage = Math.round((finalScore / totalPossibleScore) * 100);
    
    let statusColor = "text-purple-600 bg-purple-50 border-purple-100";
    if (percentage >= 80) statusColor = "text-green-600 bg-green-50 border-green-100";
    else if (percentage < 60) statusColor = "text-orange-600 bg-orange-50 border-orange-100";

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
            <div className="max-w-3xl mx-auto">
                
                {/* Dynamic Navigation Header */}
                <div className="flex justify-between items-center mb-8">
                    <Link 
                        href={isLoggedIn ? "/home" : "/"} 
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium text-sm transition-colors"
                    >
                        <ArrowLeft size={16} /> 
                        {isLoggedIn ? "Back to Dashboard" : "Back to Homepage"}
                    </Link>
                    <div className="text-sm font-mono text-gray-400 bg-gray-100 px-3 py-1 rounded-md">
                        ID: #{params.submission_id}
                    </div>
                </div>

                {/* Score Overview Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                    <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                        <div className={`inline-flex items-center justify-center p-4 rounded-full mb-4 ${statusColor}`}>
                            <Award size={36} />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.quiz_title}</h1>
                        <p className="text-gray-500 mb-6 font-medium">Student: {report.student_name}</p>
                        
                        <div className="flex justify-center items-end gap-2 mb-3">
                            <span className="text-6xl font-extrabold text-gray-900 tracking-tight">{finalScore}</span>
                            <span className="text-xl text-gray-400 font-medium mb-1.5">/ {totalPossibleScore}</span>
                        </div>
                        
                        <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
                            <div className={`h-2.5 rounded-full transition-all duration-1000 ${statusColor.split(' ')[0].replace('text-', 'bg-')}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        
                        {report.overall_feedback && (
                            <div className="bg-blue-50 border border-blue-100 text-blue-800 px-6 py-5 rounded-xl text-sm leading-relaxed text-left mx-auto max-w-2xl shadow-sm">
                                <span className="font-bold flex items-center gap-2 mb-2 text-blue-900">
                                    <CheckCircle size={16} /> Teacher's Feedback
                                </span>
                                {report.overall_feedback}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detailed Questions Breakdown */}
                <div className="space-y-6">
                    {report.graded_answers.map((q, index) => {
                        const isPerfect = q.score === 10;
                        return (
                            <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                
                                <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100 flex justify-between items-start gap-4">
                                    <div className="flex gap-3">
                                        <span className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-white border border-gray-200 text-gray-700 font-bold text-xs mt-0.5 shadow-sm">
                                            {index + 1}
                                        </span>
                                        <h3 className="text-gray-900 font-semibold leading-snug pt-0.5">{q.question_text}</h3>
                                    </div>
                                    <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${isPerfect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200 shadow-sm'}`}>
                                        {q.score} / 10
                                    </span>
                                </div>

                                <div className="p-6">
                                    <div className="mb-5">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            Your Answer
                                        </p>
                                        <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            {q.student_answer}
                                        </p>
                                    </div>

                                    <div className={`rounded-lg p-4 text-sm border ${isPerfect ? 'bg-green-50/50 border-green-100 text-green-800' : 'bg-gray-50/50 border-gray-200 text-gray-700'}`}>
                                        <div className="flex gap-3">
                                            {isPerfect ? <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" /> : <div className="w-1 flex-shrink-0" />}
                                            <div>
                                                <span className="font-bold block mb-1 text-gray-900">Feedback</span>
                                                <span className="leading-relaxed opacity-90">{q.feedback}</span>
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